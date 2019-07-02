import Worksheet from '../worksheet';
import { XMLElement } from 'xmlbuilder';
import { getExcelAlpha } from '../../utils';

export default function addDimensions(xml: XMLElement, ws: Worksheet) {
  // §18.3.1.35 dimension (Worksheet Dimensions)
  const firstCell = 'A1';
  const lastCell = `${getExcelAlpha(ws.lastUsedCol)}${ws.lastUsedRow}`;
  const ele = xml.ele('dimension');
  ele.att('ref', `${firstCell}:${lastCell}`);
  ele.up();
}
