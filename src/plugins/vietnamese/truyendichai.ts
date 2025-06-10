import { CheerioAPI, load as parseHTML } from 'cheerio';
import { fetchApi } from '@libs/fetch';
import { Plugin } from '@typings/plugin';

class TruyenDichAI implements Plugin.PagePlugin {
  id = 'truyendichai';
  name = 'Truyện Dịch AI';
  icon = 'src/vi/truyendichai/icon.png';
  site = 'https://truyendichai.com';
  version = '1.0.13';

  parseNovels(loadedCheerio: CheerioAPI) {
    const novels: Plugin.NovelItem[] = [];

    loadedCheerio('li.media').each((idx, ele) => {
      const novelName = loadedCheerio(ele).find('h2 > a').text();
      const novelCover = loadedCheerio(ele)
        .find('.nh-thumb img')
        .attr('data-src');

      const novelUrl = loadedCheerio(ele).find('h2 > a').attr('href');
      if (novelUrl) {
        novels.push({
          name: novelName,
          cover: novelCover,
          path: novelUrl.replace(this.site, ''),
        });
      }
    });

    if (novels.length < 20) {
      // add empty novel to fill the page
      for (let i = novels.length; i < 20; i++) {
        novels.push({
          name: 'Truyện mới cập nhật',
          cover: '',
          path: '',
        });
      }
    }

    console.log('novels: ', novels);
    return novels;
  }

  async popularNovels(pageNo: number): Promise<Plugin.NovelItem[]> {
    const url = `${this.site}/tim-truyen?page=${pageNo}`;
    const result = await fetchApi(url);
    const body = await result.text();
    const loadedCheerio = parseHTML(body);
    console.log('popular novels html: ', body);
    return this.parseNovels(loadedCheerio);
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    console.log('searching novels', searchTerm, pageNo);
    const searchUrl = `${this.site}/tim-truyen?keyword=${searchTerm}&page=${pageNo}`;
    const result = await fetchApi(searchUrl);
    const body = await result.text();
    const loadedCheerio = parseHTML(body);
    console.log('searching novels html: ', body);
    return this.parseNovels(loadedCheerio);
  }

  async parseNovel(
    novelPath: string,
  ): Promise<Plugin.SourceNovel & { totalPages: number }> {
    const url = this.site + novelPath;
    const result = await fetchApi(url);
    const body = await result.text();
    console.log('parse novel', url, body);
    const loadedCheerio = parseHTML(body);

    const cover = loadedCheerio('.main .nh-section .nh-thumb img')
      .first()
      .attr('src');
    const name = loadedCheerio('.main .nh-section h1').first().text();
    const status =
      loadedCheerio('.main .nh-section .media-body')
        .text()
        .indexOf('Hoàn thành') > 0
        ? 'Hoàn thành'
        : 'Đang ra';
    const summary = loadedCheerio('.main .nh-section .content').first().text();

    const soureName = loadedCheerio('.chap-tab')
      .first()
      .attr('id')
      ?.replace('tab-', '');
    const getChapterUrl = `${url}/tab_content/${soureName}`;
    console.log('chapter url: ', getChapterUrl);
    const chapterResponse = await fetchApi(getChapterUrl);
    const chappterListRes = await chapterResponse.json();
    console.log('chapter list response: ', chappterListRes);
    const chappterList: Array<any> = chappterListRes.data;

    const chapters: Plugin.ChapterItem[] = [];
    chappterList.forEach((chapter, idx) => {
      chapters.push({
        name: chapter.title,
        path: `${novelPath}/${soureName}/${chapter.chapter_url}`,
        chapterNumber: idx + 1,
      });
    });

    const novel: Plugin.SourceNovel & { totalPages: number } = {
      path: novelPath,
      cover: cover,
      name: name || 'Không có tiêu đề',
      status: status,
      summary: summary,
      chapters: chapters,
      totalPages: 1,
    };
    console.log('parsed novel: ', novel);
    return novel;
  }

  async parsePage(novelPath: string, page: string): Promise<Plugin.SourcePage> {
    const url = this.site + novelPath;
    const result = await fetchApi(url);
    const body = await result.text();
    console.log('parse page: ', url, body);
    const loadedCheerio = parseHTML(body);
    const soureName = loadedCheerio('.chap-tab')
      .first()
      .attr('id')
      ?.replace('tab-', '');
    const getChapterUrl = `${url}/tab_content/${soureName}`;
    const chapterResponse = await fetchApi(getChapterUrl);
    const chappterListRes = await chapterResponse.json();
    const chappterList: Array<any> = chappterListRes.data;

    const chapters: Plugin.ChapterItem[] = [];
    chappterList.forEach((chapter, idx) => {
      chapters.push({
        name: chapter.title,
        path: `${novelPath}/${soureName}/${chapter.chapter_url}`,
        chapterNumber: idx + 1,
      });
    });
    console.log('parsed chapters: ', chapters);
    return {
      chapters: chapters,
    };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const url = this.site + chapterPath;
    const result = await fetchApi(url);
    const body = await result.text();
    const loadedCheerio = parseHTML(body);

    console.log('parse chapter: ', url, body);
    const novelDataScript = loadedCheerio('script')
      .filter((idx, ele) => loadedCheerio(ele).text().indexOf('novel_id =') > 0)
      .text();
    console.log('novel data script: ', novelDataScript);
    const novelData = this.extractJsConstants(novelDataScript);
    const requestBody = JSON.stringify({
      novel_id: Number(novelData['novel_id']),
      source_id: Number(novelData['sourceId']),
      chapter_url: novelData['chapterUrl'],
      translator: 'AI Gemini 2 - Dịch từ tiếng Trung',
    });
    console.log('novel data: ', novelDataScript, novelData, requestBody);

    const chapterResponse = await fetchApi(
      'https://truyendichai.com/api/getChapterStream',
      {
        headers: {
          'Content-Type': 'application/json',
        },
        referrer: url,
        body: requestBody,
        method: 'POST',
      },
    );

    console.log('load chapter response status: ', chapterResponse.status);
    const chapterText = await chapterResponse.text();
    if (!chapterResponse.ok) {
      throw new Error(
        `Failed to load chapter: ${chapterResponse.statusText} - body: ${chapterText}`,
      );
    }
    return this.convertToHtml(chapterText);
  }

  convertToHtml(text: string): string {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const withBreaks = escaped.replace(/\n/g, '<br>');
    return `<div id="article">${withBreaks}</div>`;
  }

  extractJsConstants(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    const regex = /const|var\s+(\w+)\s*=\s*(\d+|'[^']*'|"[^"]*");/g;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const key = match[1];
      let value = match[2];

      // Remove quotes if it's a string
      if (
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))
      ) {
        value = value.slice(1, -1);
      } else {
        value = value;
      }

      result[key] = value;
    }
    return result;
  }
}

export default new TruyenDichAI();
