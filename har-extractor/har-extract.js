const fs = require ('fs'); 
const path = require ('path');

const DEFAULT_OPTIONS = {
  input: 'dlive.tv.har', 
  url: 'https://graphigo.prd.dlive.tv/',
  output: 'dlive.tv.har.extracted',
  keepOptions: false
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

//////////
// Main //
//////////

let options = processArguments ();

fs.readFile (options.input, 'utf8', (err, data) => {
  if (err) throw err;
  
  let harObject = JSON.parse (data);
  let requests = harObject.log.entries;

  let json = JSON.stringify(requests.filter ((item) => {
    return (item.request.url === options.url 
        && (options.keepOptions || 'OPTIONS' !== item.request.method));
  }), null, 2);

  writeOrCreateTextFile (options.output, json, (err) => {
    if (err) throw err;

    console.log (options.output + ' written!');
  });
});
