# Latentia

**Where images wait to be seen.**  
**万象未现之境。**

**The AIGC platform of OpenEnvision.**

Latentia 隶属于 OpenEnvision，关注 AIGC 图像艺术、AI 微电影与人机共创。我们希望让值得观看的作品，连同创造它们的人，一起被看见。

Latentia brings AI image art, short films and human–machine collaboration into view. Discover imagined worlds, meet their creators, and follow each work back to its source.

## 探索 / Explore

- **作品展厅 / Collection** — 70 件作品条目，包含 28 件图像、36 件影片与创作过程影像，以及 6 件装置或交互项目预览。
- **影像放映 / Films** — 官方来源播放，支持类型、时长筛选、年份排序及前后影片切换。
- **收藏 / Saved works** — 在当前浏览器保存喜爱的作品。
- **推荐 / Recommend** — 中英文推荐表单，为值得关注的作品生成可预览的推荐邮件。
- **相关链接 / Links** — 19 个精选艺术社区、AI 电影展映项目、策展平台与创作资源，支持分类、入口语言与关键词筛选。

The collection includes 70 entries across images, films and installations. The resource directory connects visitors with 19 selected communities, screening initiatives and creative resources. Recommendation and Links pages support Chinese / English switching.

## 页面 / Pages

| 页面 / Page | 入口 / Entry |
| --- | --- |
| 首页与展厅 / Home & collection | [index.html](index.html) |
| 影片 / Films | [index.html#films](index.html#films) |
| 关于 / About | [index.html#about](index.html#about) |
| 推荐作品 / Recommend | [recommend.html](recommend.html) |
| 相关链接 / Links | [links.html](links.html) |

## 署名与观看 / Credits & viewing

每件策展作品保留作者、相关机构及其实际角色，并链接至官方来源。OpenEnvision 为 Latentia 创作的四件原创概念作品单独标注；无官方中文标题时，中文名称为策展译名。

Curated works identify their creators, relevant institutions and official sources. Four original OpenEnvision concept studies are clearly marked. Chinese titles are curatorial translations when no official translation is available.

作品预览随网站保存；影片通过官方来源在线播放，需要联网。收藏保存在当前浏览器中。推荐表单生成邮件草稿，由访问者自行发送。

Image previews are included with the website. Films stream from official sources and require an internet connection. Saved works stay in this browser. Recommendation drafts are reviewed and sent by the visitor.

## 推荐作品 / Recommend a work

欢迎通过[推荐页面](recommend.html)，或发送邮件至 [openenvision.lab@gmail.com](mailto:openenvision.lab@gmail.com)，分享作品名称、作者姓名或艺名、机构、介绍、使用的技术或模型、创作时间及官方链接。

Share a work through the recommendation page or email us with its title, creator, institution, introduction, techniques or models, creation date and official source.

## 本地浏览 / Run locally

在仓库根目录运行以下命令，无需安装依赖或构建：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 [http://127.0.0.1:4173/](http://127.0.0.1:4173/)。

## GitHub Pages

网站文件直接位于仓库根目录，`index.html` 为首页，`.nojekyll` 让 Pages 直接发布静态文件。

在仓库 **Settings → Pages → Build and deployment** 中选择 **Deploy from a branch**，选择要发布的分支（如 `main`），目录设为 **/ (root)**，保存后等待部署完成。

The site is served directly from the repository root. Publish the source branch’s `/ (root)` directory with GitHub Pages; no build step is required. See the [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 版权 / Copyright

Works remain © their respective creators. Official previews and films are credited and linked to their original sources.  
影像有出处，创作有姓名。

© 2026 OpenEnvision. All rights reserved.
