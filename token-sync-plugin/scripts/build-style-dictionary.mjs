function readArg(flag) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] || null;
}

const input = readArg('--input');
const output = readArg('--output');

if (input) {
  process.env.TOKENS_FILE = input;
}

if (output) {
  process.env.STYLE_DICTIONARY_BUILD_PATH = output;
}

const [{ default: StyleDictionary }, { default: config }] = await Promise.all([
  import('style-dictionary'),
  import('../style-dictionary.config.mjs'),
]);

const sd = new StyleDictionary(config);

await sd.cleanAllPlatforms();
await sd.buildAllPlatforms();
