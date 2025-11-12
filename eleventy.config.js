import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import fontAwesomePlugin from "@11ty/font-awesome";
import pluginRss from "@11ty/eleventy-plugin-rss";
import pluginSEO from "eleventy-plugin-seo";
import { DateTime } from "luxon";
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import * as sass from "sass";
import { readFileSync } from "fs";
import path from "path";

export default function(eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(fontAwesomePlugin);

  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/favicon.png");
  eleventyConfig.addPassthroughCopy("src/js");
  // Feed XSL passthrough
  eleventyConfig.addPassthroughCopy({
    "src/feed/pretty-atom-feed.xsl": "feed/pretty-atom-feed.xsl"
  });

  eleventyConfig.addWatchTarget("src/scss/");

  eleventyConfig.addTemplateFormats("scss");
  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css",
    compile: async function(inputContent, inputPath) {
      let parsed = path.parse(inputPath);
      if (parsed.name.startsWith("_")) {
        return;
      }

      // Read site config to inject CSS variables
      let siteData;
      try {
        const siteJson = readFileSync("src/_data/site.json", "utf8");
        siteData = JSON.parse(siteJson);
      } catch (e) {
        siteData = {};
      }

      // Replace Hugo template syntax with actual values
      let processedContent = inputContent
        .replace(/\{\{ \.Site\.Params\.fontFamilyHeading \| default "'Poppins', sans-serif" \}\}/g, 
          `'${siteData.fontFamilyHeading || 'Poppins'}', sans-serif`)
        .replace(/\{\{ \.Site\.Params\.fontFamilyParagraph \| default "'Helvetica', sans-serif" \}\}/g, 
          `'${siteData.fontFamilyParagraph || 'Helvetica'}', sans-serif`)
        .replace(/\{\{ \.Site\.Params\.fontFamilyMonospace \| default "monospace" \}\}/g, 
          `'${siteData.fontFamilyMonospace || 'monospace'}'`)
        .replace(/\{\{ \.Site\.Params\.baseColor \| default "#ffffff" \}\}/g, 
          siteData.baseColor || '#ffffff')
        .replace(/\{\{ \.Site\.Params\.baseOffsetColor \| default "#eaeaea" \}\}/g, 
          siteData.baseOffsetColor || '#eaeaea')
        .replace(/\{\{ \.Site\.Params\.highlightColor \| default "#7b16ff" \}\}/g, 
          siteData.highlightColor || '#7b16ff')
        .replace(/\{\{ \.Site\.Params\.headingColor \| default "#1c1b1d" \}\}/g, 
          siteData.headingColor || '#1c1b1d')
        .replace(/\{\{ \.Site\.Params\.textColor \| default "#4e5157" \}\}/g, 
          siteData.textColor || '#4e5157')
        .replace(/\{\{ \.Site\.Params\.dotColor \| default "#7b16ff" \}\}/g, 
          siteData.dotColor || '#7b16ff');

      let result = sass.compileString(processedContent, {
        loadPaths: [parsed.dir || ".", "src/scss"]
      });

      return async () => {
        return result.css;
      };
    }
  });
  // RSS/Atom feed plugin (provides filters: rssLastUpdatedDate, rssDate, absoluteUrl)
  eleventyConfig.addPlugin(pluginRss);

  // SEO plugin configuration
  let seoData = {};
  try {
    const siteJson = readFileSync("src/_data/site.json", "utf8");
    seoData = JSON.parse(siteJson);
  } catch (e) {
    // ignore if seo.json missing; plugin can run with defaults
  }
  eleventyConfig.addPlugin(pluginSEO, seoData);
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("LLLL d, yyyy");
  });

  eleventyConfig.addFilter("htmlDateString", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd");
  });
  // ISO 8601 date for Atom <updated> and <published>
  eleventyConfig.addFilter("isoDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toISO();
  });

  eleventyConfig.addFilter("limit", (array, limit) => {
    return array.slice(0, limit);
  });

  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md")
      .filter(item => !item.data.draft)
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("tagList", function(collection) {
    let tagSet = new Set();
    collection.getAll().forEach(item => {
      (item.data.tags || []).forEach(tag => tagSet.add(tag));
    });
    return [...tagSet].sort();
  });

  let markdownLibrary = markdownIt({
    html: true,
    breaks: false,
    linkify: true
  }).use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.ariaHidden({
      placement: "after",
      class: "direct-link",
      symbol: "#"
    }),
    level: [1, 2, 3, 4],
    slugify: eleventyConfig.getFilter("slugify")
  });

  eleventyConfig.setLibrary("md", markdownLibrary);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["md", "njk", "html", "liquid"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
}
