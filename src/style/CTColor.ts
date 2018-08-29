import { getColor } from '../style/excelColor';
import { colorScheme } from '../style/colorScheme';

export default class CTColor {
  //§18.8.3 && §18.8.19
  type: 'rgb' | 'theme';
  rgb: string;
  theme: string;
  /**
   * @class CTColor
   * @desc Excel color representation
   * @param {String} color Excel Color scheme or Excel Color name or HEX value of Color
   * @properties {String} type Type of color object. defaults to rgb
   * @properties {String} rgb ARGB representation of Color
   * @properties {String} theme Excel Color Scheme
   * @returns {CTColor}
   */
  constructor(color) {
    this.type;
    this.rgb;
    this.theme; //§20.1.6.2 clrScheme (Color Scheme) : types.colorSchemes

    if (typeof color === 'string') {
      if (colorScheme[color.toLowerCase()] !== undefined) {
        this.theme = color;
        this.type = 'theme';
      } else {
        this.rgb = getColor(color);
        this.type = 'rgb';
      }
    }
  }

  /**
   * @func CTColor.toObject
   * @desc Converts the CTColor instance to a javascript object
   * @returns {Object}
   */
  toObject() {
    return this[this.type];
  }

  /**
   * @alias CTColor.addToXMLele
   * @desc When generating Workbook output, attaches style to the styles xml file
   * @func CTColor.addToXMLele
   * @param {xmlbuilder.Element} ele Element object of the xmlbuilder module
   */
  addToXMLele(ele) {
    let colorEle = ele.ele('color');
    colorEle.att(this.type, this[this.type]);
  }
}
