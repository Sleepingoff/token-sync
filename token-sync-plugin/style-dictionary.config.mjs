import {
  register,
  expandTypesMap,
  getTransforms,
} from "@tokens-studio/sd-transforms";
import StyleDictionary from "style-dictionary";

register(StyleDictionary, {
  platform: "css",
});

// Change this fallback if your repository stores the exported token file at a different path.
const tokensFile = process.env.TOKENS_FILE || "tokens.json";
// Change this fallback if you want Style Dictionary outputs in a different folder.
const buildPath = process.env.STYLE_DICTIONARY_BUILD_PATH || "build/tokens/";

export default {
  source: [tokensFile],
  // Replace or extend preprocessors if your token document structure changes.
  preprocessors: ["tokens-sync"],
  expand: {
    typesMap: expandTypesMap,
  },
  platforms: {
    css: {
      // Adjust transforms or add more platforms if you need outputs beyond CSS variables.
      transforms: [...getTransforms({ platform: "css" }), "name/kebab"],
      buildPath,
      files: [
        {
          // Change the destination filename to match your consuming app's convention.
          destination: "variables.css",
          // Replace the format if you want SCSS, JS, Android, iOS, etc.
          format: "css/variables",
          options: {
            outputReferences: true,
          },
        },
      ],
    },
  },
};
