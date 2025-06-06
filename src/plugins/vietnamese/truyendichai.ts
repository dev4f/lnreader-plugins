import { CheerioAPI, load as parseHTML } from 'cheerio';
import { fetchApi } from '@libs/fetch';
import { Plugin } from '@typings/plugin';
import { NovelStatus } from '@libs/novelStatus';

class TruyenDichAI implements Plugin.PluginBase {
  id = 'truyendichai';
  name = 'Truyện Dịch AI';
  icon = 'src/vi/truyendichai/icon.png';
  site = 'https://truyendichai.com';
  version = '1.0.0';

  parseNovels(loadedCheerio: CheerioAPI) {
    const novels: Plugin.NovelItem[] = [];
    loadedCheerio('.media.py-4').each((idx, ele) => {
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
    return novels;
  }

  async popularNovels(pageNo: number): Promise<Plugin.NovelItem[]> {
    const url = `${this.site}/tim-truyen?page=${pageNo}`;
    const result = await fetchApi(url);
    const body = await result.text();
    const loadedCheerio = parseHTML(body);

    return this.parseNovels(loadedCheerio);
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    const searchUrl = `${this.site}/tim-truyen?keyword=${searchTerm}&page=${pageNo}`;
    const result = await fetchApi(searchUrl);
    const body = await result.text();
    const loadedCheerio = parseHTML(body);
    return this.parseNovels(loadedCheerio);
  }

  async parseNovel(
    novelPath: string,
  ): Promise<Plugin.SourceNovel & { totalPages: number }> {
    const url = this.site + novelPath;
    const result = await fetchApi(url);
    const chappterListRes = await result.json();
    const chappterList: Array<any> = chappterListRes.data;

    const chapters: Plugin.ChapterItem[] = [];
    chappterList.forEach((chapter, idx) => {
      chapters.push({
        name: chapter.title,
        path: chapter.chapter_url,
        chapterNumber: idx + 1,
      });
    });

    const novel: Plugin.SourceNovel & { totalPages: number } = {
      path: novelPath,
      name: 'Không có tiêu đề',
      chapters: chapters,
      totalPages: 1,
    };
    return novel;
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const result = await fetchApi(this.site + chapterPath);
    const body = await result.text();
    const loadedCheerio = parseHTML(body);
    const chapterText = loadedCheerio('#chapter-c').html() || '';
    return chapterText;
  }
}

export default new TruyenDichAI();
