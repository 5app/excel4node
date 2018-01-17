import { CfRule } from './cf_rule';

// -----------------------------------------------------------------------------

export class CfRulesCollection {
  // §18.3.1.18 conditionalFormatting (Conditional Formatting)
  private rulesBySqref;

  constructor() {
    // rules are indexed by cell refs
    this.rulesBySqref = {};
  }

  get count() {
    return Object.keys(this.rulesBySqref).length;
  }

  add(sqref, ruleConfig) {
    const rules =
      this.rulesBySqref[sqref] !== undefined ? this.rulesBySqref[sqref] : [];
    const newRule = new CfRule(ruleConfig);
    rules.push(newRule);
    this.rulesBySqref[sqref] = rules;
    return this;
  }

  addToXMLele(ele) {
    Object.keys(this.rulesBySqref).forEach((sqref) => {
      const thisEle = ele.ele('conditionalFormatting').att('sqref', sqref);
      this.rulesBySqref[sqref].forEach((rule) => {
        rule.addToXMLele(thisEle);
      });
    });
  }
}
