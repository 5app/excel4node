import Worksheet from "../worksheet/worksheet";
import Style from "../style/style";
import Border from "../style/classes/border.js";
import Fill from "../style/classes/fill.js";
import DXFCollection from "./dxfCollection.js";
import MediaCollection from "./mediaCollection.js";
import DefinedNameCollection from "../classes/definedNameCollection.js";
import * as SlothLogger from "sloth-logger";
import * as types from "../types/index.js";
import * as builder from "./builder.js";
import * as http from "http";
import * as fs from "fs";
import { merge } from "lodash";

/* Available options for Workbook
{
    jszip : {
        compression : 'DEFLATE'
    },
    defaultFont : {
        size : 12,
        family : 'Calibri',
        color : 'FFFFFFFF'
    }
}
*/
// Default Options for Workbook
let workbookDefaultOpts = {
  jszip: {
    compression: "DEFLATE",
  },
  defaultFont: {
    color: "FF000000",
    name: "Calibri",
    size: 12,
    family: "roman",
  },
  dateFormat: "m/d/yy",
};

class Workbook {
  private logger;
  private opts;
  private sheets;
  private sharedStyles;
  private sharedStrings;
  private styles;
  private stylesLookup;
  private dxfCollection;
  private mediaCollection;
  private definedNameCollection;
  private styleData;
  private styleDataLookup;

  /**
   * @class Workbook
   * @param {Object} opts Workbook settings
   * @param {Object} opts.jszip
   * @param {String} opts.jszip.compression JSZip compression type. defaults to 'DEFLATE'
   * @param {Object} opts.defaultFont
   * @param {String} opts.defaultFont.color HEX value of default font color. defaults to #000000
   * @param {String} opts.defaultFont.name Font name. defaults to Calibri
   * @param {Number} opts.defaultFont.size Font size. defaults to 12
   * @param {String} opts.defaultFont.family Font family. defaults to roman
   * @param {String} opts.dataFormat Specifies the format for dates in the Workbook. defaults to 'm/d/yy'
   * @param {Number} opts.workbookView.activeTab Specifies an unsignedInt that contains the index to the active sheet in this book view.
   * @param {Boolean} opts.workbookView.autoFilterDateGrouping Specifies a boolean value that indicates whether to group dates when presenting the user with filtering options in the user interface.
   * @param {Number} opts.workbookView.firstSheet Specifies the index to the first sheet in this book view.
   * @param {Boolean} opts.workbookView.minimized Specifies a boolean value that indicates whether the workbook window is minimized.
   * @param {Boolean} opts.workbookView.showHorizontalScroll Specifies a boolean value that indicates whether to display the horizontal scroll bar in the user interface.
   * @param {Boolean} opts.workbookView.showSheetTabs Specifies a boolean value that indicates whether to display the sheet tabs in the user interface.
   * @param {Boolean} opts.workbookView.showVerticalScroll Specifies a boolean value that indicates whether to display the vertical scroll bar.
   * @param {Number} opts.workbookView.tabRatio Specifies ratio between the workbook tabs bar and the horizontal scroll bar.
   * @param {String} opts.workbookView.visibility Specifies visible state of the workbook window. ('hidden', 'veryHidden', 'visible') (§18.18.89)
   * @param {Number} opts.workbookView.windowHeight Specifies the height of the workbook window. The unit of measurement for this value is twips.
   * @param {Number} opts.workbookView.windowWidth Specifies the width of the workbook window. The unit of measurement for this value is twips..
   * @param {Number} opts.workbookView.xWindow Specifies the X coordinate for the upper left corner of the workbook window. The unit of measurement for this value is twips.
   * @param {Number} opts.workbookView.yWindow Specifies the Y coordinate for the upper left corner of the workbook window. The unit of measurement for this value is twips.
   * @returns {Workbook}
   */
  constructor(opts) {
    opts = opts ? opts : {};

    this.logger = new SlothLogger.Logger({
      logLevel: isNaN(parseInt(opts.logLevel)) ? 0 : parseInt(opts.logLevel),
    });

    this.opts = merge({}, workbookDefaultOpts, opts);

    this.sheets = [];
    this.sharedStrings = [];
    this.styles = [];
    this.stylesLookup = {};
    this.dxfCollection = new DXFCollection(this);
    this.mediaCollection = new MediaCollection();
    this.definedNameCollection = new DefinedNameCollection();
    this.styleData = {
      numFmts: [],
      fonts: [],
      fills: [
        new Fill({ type: "pattern", patternType: "none" }),
        new Fill({ type: "pattern", patternType: "gray125" }),
      ],
      borders: [new Border()],
      cellXfs: [
        {
          borderId: null,
          fillId: null,
          fontId: 0,
          numFmtId: null,
        },
      ],
    };

    // Lookups for style components to quickly find existing entries
    // - Lookup keys are stringified JSON of a style's toObject result
    // - Lookup values are the indexes for the actual entry in the styleData arrays
    this.styleDataLookup = {
      fonts: {},
      fills: this.styleData.fills.reduce((ret, fill, index) => {
        ret[JSON.stringify(fill.toObject())] = index;
        return ret;
      }, {}),
      borders: this.styleData.borders.reduce((ret, border, index) => {
        ret[JSON.stringify(border.toObject())] = index;
        return ret;
      }, {}),
    };

    // Set Default Font and Style
    this.createStyle({ font: this.opts.defaultFont });
  }

  /**
   * setSelectedTab
   * @param {Number} tab number of sheet that should be displayed when workbook opens. tabs are indexed starting with 1
   **/
  setSelectedTab(id) {
    this.sheets.forEach(s => {
      if (s.sheetId === id) {
        s.opts.sheetView.tabSelected = 1;
      } else {
        s.opts.sheetView.tabSelected = 0;
      }
    });
  }

  /**
   * writeToBuffer
   * Writes Excel data to a node Buffer.
   */
  writeToBuffer() {
    return builder.writeToBuffer(this);
  }

  /**
   * Generate .xlsx file.
   * @param {String} fileName Name of Excel workbook with .xslx extension
   * @param {http.response | callback} http response object or callback function (optional).
   * If http response object is given, file is written to http response. Useful for web applications.
   * If callback is given, callback called with (err, fs.Stats) passed
   */
  write(fileName, handler) {
    builder
      .writeToBuffer(this)
      .then((buffer: Buffer) => {
        switch (typeof handler) {
          // handler passed as http response object.

          case "object":
            if (handler instanceof http.ServerResponse) {
              handler.writeHead(200, {
                "Content-Length": buffer.length,
                "Content-Type":
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition":
                  'attachment; filename="' + fileName + '"',
              });
              handler.end(buffer);
            } else {
              throw new TypeError("Unknown object sent to write function.");
            }
            break;

          // handler passed as callback function
          case "function":
            fs.writeFile(fileName, buffer, function(err) {
              if (err) {
                handler(err);
              } else {
                fs.stat(fileName, handler);
              }
            });
            break;

          // no handler passed, write file to FS.
          default:
            fs.writeFile(fileName, buffer, function(err) {
              if (err) {
                throw err;
              }
            });
            break;
        }
      })
      .catch(e => {
        if (handler instanceof http.ServerResponse) {
          this.logger.error(e.stack);
          handler.statusCode = 500;
          handler.setHeader("Content-Type", "text/plain");
          handler.end("500 Server Error");
        } else if (typeof handler === "function") {
          handler(e.stack);
        } else {
          this.logger.error(e.stack);
        }
      });
  }

  /**
   * Add a worksheet to the Workbook
   * @param {String} name Name of the Worksheet
   * @param {Object} opts Options for Worksheet. See Worksheet class definition
   * @returns {Worksheet}
   */
  addWorksheet(name, opts) {
    let newLength = this.sheets.push(new Worksheet(this, name, opts));
    return this.sheets[newLength - 1];
  }

  /**
   * Add a Style to the Workbook
   * @param {Object} opts Options for the style. See Style class definition
   * @returns {Style}
   */
  createStyle(opts) {
    const thisStyle = new Style(this, opts);
    const lookupKey = JSON.stringify(thisStyle.toObject());

    // Use existing style if one exists
    if (this.stylesLookup[lookupKey]) {
      return this.stylesLookup[lookupKey];
    }

    this.stylesLookup[lookupKey] = thisStyle;
    const index = this.styles.push(thisStyle) - 1;
    this.styles[index].ids.cellXfs = index;
    return this.styles[index];
  }

  /**
   * Gets the index of a string from the shared string array if exists and adds the string if it does not and returns the new index
   * @param {String} val Text of string
   * @returns {Number} index of the string in the shared strings array
   */
  getStringIndex(val) {
    if (this.sharedStrings.indexOf(val) < 0) {
      this.sharedStrings.push(val);
    }
    return this.sharedStrings.indexOf(val);
  }
}

module.exports = Workbook;