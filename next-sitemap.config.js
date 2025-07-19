import fs from "fs/promises";
import path from "path";

export default {
  siteUrl: "https://joshuamarkle.com",
  generateRobotsTxt: true,
  outDir: "public",
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
  },
};
