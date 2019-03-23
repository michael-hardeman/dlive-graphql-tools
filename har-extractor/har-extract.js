const fs = require ('fs'); 
const path = require ('path');

const DEFAULT_OPTIONS = {
  keepOptions: false,
  stripPII: false,
  input: 'dlive.tv.har', 
  url: 'https://graphigo.prd.dlive.tv/',
  output: 'extracted.dlive.tv.har'
};

function extractSelfDetails () {
  let output = {};
  output.cmd = path.basename (process.argv.shift ());
  output.file = path.basename (process.argv.shift ());
  return output;
}

function required (label, value) {
  if (!value) throw new Error ('Expected: ' + label);
}

function maybeExtractOptionalArguments (options) {
  let nextArg;
  while ((nextArg = process.argv.shift ())) {
    switch (nextArg) {
      case '-k': options.keepOptions = true; break;
      case '-s': options.stripPII = false; break;
      case '-i': required ('input',  (options.input  = process.argv.shift ())); break;
      case '-o': required ('output', (options.output = process.argv.shift ())); break;
      case '-u': required ('url',    (options.url    = process.argv.shift ())); break;
      default: 
        if ('-' !== nextArg.charAt(0) || nextArg.length <= 2) {
          throw new Error ('Unexpected argument: ' + nextArg);
        }

        // converts '-abcd' into ['-a', '-b', '-c', '-d'] then unshifts them into argv
        process.argv.unshift(
          ...Array.prototype.map.call(nextArg.substr(1), c => '-' + c)
        );
    }
  }
}

function processArguments() {
  let options = JSON.parse (JSON.stringify (DEFAULT_OPTIONS));

  let selfDetails = extractSelfDetails ();

  try {
    maybeExtractOptionalArguments (options);
  } catch (e) {
    console.error (e.message);
    console.log (
      `Usage: ${selfDetails.cmd} ${selfDetails.file} [options]\n\n` +
      '  -k        keep OPTIONS requests.\n' +
      `            default: ${DEFAULT_OPTIONS.keepOptions}\n` +
      '  -s        strip personally identifiable information.\n' +
      `            default: ${DEFAULT_OPTIONS.stripPII}\n` +
      '  -i input  the path to the .har you want to parse.\n' +
      `            default: ${DEFAULT_OPTIONS.input}\n` +
      '  -o output the path to what output file you want.\n' +
      `            default: ${DEFAULT_OPTIONS.output}\n` +
      '  -u url    the url of the dlive graphql endpoint.\n' +
      `            default: ${DEFAULT_OPTIONS.url}\n`);
    process.exit(1);
  }

  return options;
}

function writeTextFile (fileName, data, callback) {
  fs.writeFile (fileName, data, 'utf8', (err) => {
    if (err) throw err;

    callback ();
  });
}

function writeOrCreateTextFile (fileName, data, callback) {
  fs.exists(fileName, (exists) => {
    if (exists) { 
      writeTextFile (fileName, data, callback);
    } else {
      fs.writeFile (fileName, {flag: 'wx'}, (err) => { 
        if (err) throw err;

        writeTextFile (fileName, data, callback);
      });
    }
  });
}

function shouldRemoveBecauseUrlIsWrong (item, options) {
  return item.request.url !== options.url;
}
function shouldRemoveBecauseIsOptions (item, options) {
  return (!options.keepOptions && 'OPTIONS' === item.request.method);
}

function filterOutIrrelevantLogEntries(harObject, options) {
  harObject.log.entries = harObject.log.entries.filter ((item) => {
    return !(shouldRemoveBecauseUrlIsWrong (item, options) ||
             shouldRemoveBecauseIsOptions  (item, options));
  });
}

function shouldStripPIIFromEntries(harObject, options) {
  if (!options.stripPII) { return; }
  harObject.log.entries = harObject.log.entries.map ((item) => {

    // TODO: determine which requests contain PII
    // TODO: replace that PII with something generic.

    return item;
  });
}

//////////
// Main //
//////////

let options = processArguments ();

fs.readFile (options.input, 'utf8', (err, data) => {
  if (err) throw err;
  
  let harObject = JSON.parse (data);

  filterOutIrrelevantLogEntries(harObject, options);
  shouldStripPIIFromEntries(harObject, options);

  writeOrCreateTextFile (options.output, JSON.stringify(harObject, null, 2), (err) => {
    if (err) throw err;

    console.log (options.output + ' written!');
  });
});
