import { CheerioAPI, load as parseHTML } from 'cheerio';
import { fetchApi } from '@libs/fetch';
import { Plugin } from '@typings/plugin';

class TruyenDichAI implements Plugin.PagePlugin {
  id = 'truyendichai';
  name = 'Truyện Dịch AI';
  icon = 'src/vi/truyendichai/icon.png';
  site = 'https://truyendichai.com';
  version = '1.0.9';

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
          cover: 'https://truyendichai.com/assets/images/no-cover.png',
          path: '',
        });
      }
    }

    console.log(novels);
    return novels;
  }

  async popularNovels(pageNo: number): Promise<Plugin.NovelItem[]> {
    const url = `${this.site}/tim-truyen?page=${pageNo}`;
    const result = await fetchApi(url);
    const body = await result.text();
    const loadedCheerio = parseHTML(body);
    console.log(body);
    return this.parseNovels(loadedCheerio);
  }

  async loadHtml(pageNo: number): Promise<string> {
    const url = `${this.site}/tim-truyen?page=${pageNo}`;
    const result = await fetchApi(url);
    const body = await result.text();
    return body;
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
    console.log(body);
    return this.parseNovels(loadedCheerio);
  }

  async parseNovel(
    novelPath: string,
  ): Promise<Plugin.SourceNovel & { totalPages: number }> {
    const url = this.site + novelPath;
    console.log('novel url', url);
    const result = await fetchApi(url);
    const body = await result.text();
    console.log(body);
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
    console.log(getChapterUrl);
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

    const novel: Plugin.SourceNovel & { totalPages: number } = {
      path: novelPath,
      cover: cover,
      name: name || 'Không có tiêu đề',
      status: status,
      summary: summary,
      chapters: chapters,
      totalPages: 1,
    };
    return novel;
  }

  async parsePage(novelPath: string, page: string): Promise<Plugin.SourcePage> {
    const url = this.site + novelPath;
    const result = await fetchApi(url);
    const body = await result.text();
    const loadedCheerio = parseHTML(body);
    const soureName = loadedCheerio('#chapter-list .chap-list.tab-pane')
      .first()
      .attr('id');
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
    return {
      chapters: chapters,
    };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const url = this.site + chapterPath;
    const result = await fetchApi(url);
    const body = await result.text();
    const loadedCheerio = parseHTML(body);

    console.log(body);
    const novelDataScript = loadedCheerio('script')
      .filter((idx, ele) => loadedCheerio(ele).text().indexOf('novel_id =') > 0)
      .text();
    const novelData = this.extractJsConstants(novelDataScript);

    console.log(novelData);
    const requestBody = JSON.stringify({
      novel_id: Number(novelData['novel_id']),
      source_id: Number(novelData['sourceId']),
      chapter_url: novelData['chapterUrl'],
      translator: 'AI Gemini 2 - Dịch từ tiếng Trung',
    });
    console.log(novelDataScript, novelData, requestBody);

    const chapterResponse = await fetchApi(
      'https://truyendichai.com/api/getChapterStream',
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie':
            'access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Ilx1MjAwZWVkd2FyZC5lbHJpYzk2QFx1MjAwYmFvbC5jb20iLCJ1c2VyX2lkIjoyMTAsInVzZXJuYW1lIjoidXNlcl8yMDI1MDYwNjA0MjkxMSIsImF2YXRhcl9wYXRoIjpudWxsLCJleHAiOjE3NjQ4MTA1MzMsImdlbWluaV9rZXkiOiJBSXphU3lBTEJTM2k2MndHTDJmcGJ1TVIySFh5ejhTcnZWOTZhRm8ifQ.VyfwU4di8F3-x_HHECf2-LMnV6vcRsP-Es-CWf_FCAY',
        },
        referrer: url,
        body: requestBody,
        method: 'POST',
      },
    );

    console.log(chapterResponse.status);

    const chapterText = await chapterResponse.text();
    return chapterText;
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
