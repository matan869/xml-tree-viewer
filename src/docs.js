/* Recognise the structured business documents that non-developers are now
   legally required to receive as XML, and pull them into a shape the viewer can
   render as an actual invoice or bank statement.

   Everything matches on LOCAL names, never prefixes: the same UBL invoice ships
   with cac:/cbc:, ns2:, or no prefix at all depending on who generated it.

   Formats: UBL 2.1 Invoice/CreditNote (Peppol BIS, EN 16931), UN/CEFACT CII
   (XRechnung, ZUGFeRD/Factur-X), FatturaPA (Italy), KSeF FA (Poland),
   ISO 20022 camt.053 bank statements. */
(function (root) {
  "use strict";
  const XMLV = root.XMLV = root.XMLV || {};

  const ln = (n) => (n.localName || n.nodeName || "").replace(/^.*:/, "");

  /** Direct children of `node` whose local name is `name`. */
  function kids(node, name) {
    const out = [];
    if (!node) return out;
    for (const c of node.children) if (ln(c) === name) out.push(c);
    return out;
  }

  /** Follow a slash-separated path of local names; returns the first match. */
  function pick(node, path) {
    let cur = node;
    for (const part of path.split("/")) {
      if (!cur) return null;
      cur = kids(cur, part)[0] || null;
    }
    return cur;
  }

  function pickAll(node, path) {
    const parts = path.split("/");
    let level = [node].filter(Boolean);
    for (const part of parts) {
      const next = [];
      for (const n of level) next.push(...kids(n, part));
      level = next;
    }
    return level;
  }

  const txt = (n) => (n && n.textContent ? n.textContent.trim() : "");
  const t = (node, path) => txt(pick(node, path));

  /** First non-empty value among several candidate paths. */
  function firstOf(node, paths) {
    for (const p of paths) {
      const v = t(node, p);
      if (v) return v;
    }
    return "";
  }

  /** Anything named like an amount, anywhere below, keeping its currency. */
  function amount(node, path) {
    const n = pick(node, path);
    if (!n) return null;
    const v = txt(n);
    if (!v) return null;
    return { value: v, currency: n.getAttribute("currencyID") || n.getAttribute("Ccy") || "" };
  }

  function detect(doc) {
    const r = doc.documentElement;
    if (!r) return null;
    const name = ln(r);
    const ns = (r.namespaceURI || "") + " " + (r.getAttribute("xmlns") || "");
    if (name === "Invoice" || name === "CreditNote") {
      if (/ubl|oasis/i.test(ns) || pick(r, "AccountingSupplierParty")) return "ubl";
    }
    if (name === "CrossIndustryInvoice") return "cii";
    if (name === "FatturaElettronica" || name === "FatturaElettronicaSemplificata") return "fatturapa";
    if (name === "Faktura" && /ksef|crd\.gov\.pl/i.test(ns)) return "ksef";
    if (name === "Document") {
      if (/camt\.053/i.test(ns) || pick(r, "BkToCstmrStmt")) return "camt053";
      if (/camt\.052/i.test(ns) || pick(r, "BkToCstmrAcctRpt")) return "camt053";
    }
    return null;
  }

  // ---------- UBL (Peppol BIS / EN 16931) ----------
  function party(p) {
    if (!p) return {};
    return {
      name: firstOf(p, ["PartyLegalEntity/RegistrationName", "PartyName/Name", "Person/FamilyName"]),
      vat: firstOf(p, ["PartyTaxScheme/CompanyID", "PartyLegalEntity/CompanyID", "EndpointID"]),
      address: [t(p, "PostalAddress/StreetName"), t(p, "PostalAddress/AdditionalStreetName"),
                t(p, "PostalAddress/CityName"), t(p, "PostalAddress/PostalZone"),
                t(p, "PostalAddress/Country/IdentificationCode")].filter(Boolean).join(", "),
      contact: [t(p, "Contact/Name"), t(p, "Contact/ElectronicMail"), t(p, "Contact/Telephone")].filter(Boolean).join(" · "),
    };
  }

  function readUbl(doc) {
    const r = doc.documentElement;
    const cur = t(r, "DocumentCurrencyCode");
    const lineTag = kids(r, "InvoiceLine").length ? "InvoiceLine" : "CreditNoteLine";
    const qtyTag = lineTag === "InvoiceLine" ? "InvoicedQuantity" : "CreditedQuantity";
    const lines = kids(r, lineTag).map((l) => ({
      id: t(l, "ID"),
      name: firstOf(l, ["Item/Name", "Item/Description"]),
      note: t(l, "Item/Description"),
      qty: t(l, qtyTag),
      unit: (pick(l, qtyTag) || {}).getAttribute ? pick(l, qtyTag).getAttribute("unitCode") || "" : "",
      price: t(l, "Price/PriceAmount"),
      vat: t(l, "Item/ClassifiedTaxCategory/Percent"),
      total: t(l, "LineExtensionAmount"),
    }));
    const taxes = pickAll(r, "TaxTotal/TaxSubtotal").map((s) => ({
      rate: firstOf(s, ["TaxCategory/Percent"]),
      base: t(s, "TaxableAmount"),
      tax: t(s, "TaxAmount"),
      code: firstOf(s, ["TaxCategory/ID"]),
    }));
    return {
      kind: ln(r) === "CreditNote" ? "Credit note" : "Invoice",
      format: "UBL 2.1 / Peppol BIS (EN 16931)",
      number: t(r, "ID"),
      issued: t(r, "IssueDate"),
      due: firstOf(r, ["DueDate", "PaymentMeans/PaymentDueDate"]),
      currency: cur,
      note: t(r, "Note"),
      buyerRef: firstOf(r, ["BuyerReference", "OrderReference/ID"]),
      seller: party(pick(r, "AccountingSupplierParty/Party")),
      buyer: party(pick(r, "AccountingCustomerParty/Party")),
      lines, taxes,
      totals: {
        net: t(r, "LegalMonetaryTotal/LineExtensionAmount"),
        taxExclusive: t(r, "LegalMonetaryTotal/TaxExclusiveAmount"),
        taxInclusive: t(r, "LegalMonetaryTotal/TaxInclusiveAmount"),
        tax: t(r, "TaxTotal/TaxAmount"),
        prepaid: t(r, "LegalMonetaryTotal/PrepaidAmount"),
        payable: t(r, "LegalMonetaryTotal/PayableAmount"),
      },
      payment: {
        iban: firstOf(r, ["PaymentMeans/PayeeFinancialAccount/ID"]),
        bic: firstOf(r, ["PaymentMeans/PayeeFinancialAccount/FinancialInstitutionBranch/ID"]),
        reference: firstOf(r, ["PaymentMeans/PaymentID"]),
        terms: firstOf(r, ["PaymentTerms/Note"]),
      },
    };
  }

  // ---------- UN/CEFACT CII (XRechnung, ZUGFeRD / Factur-X) ----------
  function ciiParty(p) {
    if (!p) return {};
    return {
      name: firstOf(p, ["Name"]),
      vat: firstOf(p, ["SpecifiedTaxRegistration/ID"]),
      address: [t(p, "PostalTradeAddress/LineOne"), t(p, "PostalTradeAddress/CityName"),
                t(p, "PostalTradeAddress/PostcodeCode"), t(p, "PostalTradeAddress/CountryID")]
                .filter(Boolean).join(", "),
      contact: [t(p, "DefinedTradeContact/PersonName"),
                t(p, "DefinedTradeContact/EmailURIUniversalCommunication/URIID")].filter(Boolean).join(" · "),
    };
  }

  function readCii(doc) {
    const r = doc.documentElement;
    const head = pick(r, "ExchangedDocument");
    const tx = pick(r, "SupplyChainTradeTransaction");
    const agree = pick(tx, "ApplicableHeaderTradeAgreement");
    const settle = pick(tx, "ApplicableHeaderTradeSettlement");
    const sum = pick(settle, "SpecifiedTradeSettlementHeaderMonetarySummation");
    const lines = kids(tx, "IncludedSupplyChainTradeLineItem").map((l) => ({
      id: t(l, "AssociatedDocumentLineDocument/LineID"),
      name: t(l, "SpecifiedTradeProduct/Name"),
      note: t(l, "SpecifiedTradeProduct/Description"),
      qty: t(l, "SpecifiedLineTradeDelivery/BilledQuantity"),
      unit: (pick(l, "SpecifiedLineTradeDelivery/BilledQuantity") || {}).getAttribute
        ? pick(l, "SpecifiedLineTradeDelivery/BilledQuantity").getAttribute("unitCode") || "" : "",
      price: t(l, "SpecifiedLineTradeAgreement/NetPriceProductTradePrice/ChargeAmount"),
      vat: t(l, "SpecifiedLineTradeSettlement/ApplicableTradeTax/RateApplicablePercent"),
      total: t(l, "SpecifiedLineTradeSettlement/SpecifiedTradeSettlementLineMonetarySummation/LineTotalAmount"),
    }));
    const taxes = kids(settle, "ApplicableTradeTax").map((s) => ({
      rate: t(s, "RateApplicablePercent"), base: t(s, "BasisAmount"),
      tax: t(s, "CalculatedAmount"), code: t(s, "CategoryCode"),
    }));
    return {
      kind: "Invoice",
      format: "UN/CEFACT CII — XRechnung / ZUGFeRD / Factur-X",
      number: txt(pick(head, "ID")),
      issued: firstOf(head, ["IssueDateTime/DateTimeString"]),
      due: firstOf(settle, ["SpecifiedTradePaymentTerms/DueDateDateTime/DateTimeString"]),
      currency: t(settle, "InvoiceCurrencyCode"),
      note: firstOf(head, ["IncludedNote/Content"]),
      buyerRef: firstOf(agree, ["BuyerReference"]),
      seller: ciiParty(pick(agree, "SellerTradeParty")),
      buyer: ciiParty(pick(agree, "BuyerTradeParty")),
      lines, taxes,
      totals: {
        net: t(sum, "LineTotalAmount"), taxExclusive: t(sum, "TaxBasisTotalAmount"),
        taxInclusive: t(sum, "GrandTotalAmount"), tax: t(sum, "TaxTotalAmount"),
        prepaid: t(sum, "TotalPrepaidAmount"), payable: t(sum, "DuePayableAmount"),
      },
      payment: {
        iban: firstOf(settle, ["SpecifiedTradeSettlementPaymentMeans/PayeePartyCreditorFinancialAccount/IBANID"]),
        bic: firstOf(settle, ["SpecifiedTradeSettlementPaymentMeans/PayeeSpecifiedCreditorFinancialInstitution/BICID"]),
        reference: firstOf(settle, ["PaymentReference"]),
        terms: firstOf(settle, ["SpecifiedTradePaymentTerms/Description"]),
      },
    };
  }

  // ---------- FatturaPA (Italy) ----------
  function fpaParty(p) {
    if (!p) return {};
    const a = pick(p, "DatiAnagrafici");
    const s = pick(p, "Sede");
    return {
      name: firstOf(a, ["Anagrafica/Denominazione"]) ||
            [t(a, "Anagrafica/Nome"), t(a, "Anagrafica/Cognome")].filter(Boolean).join(" "),
      vat: [t(a, "IdFiscaleIVA/IdPaese") + t(a, "IdFiscaleIVA/IdCodice"), t(a, "CodiceFiscale")]
             .filter((x) => x && x.length > 2).join(" · "),
      address: [t(s, "Indirizzo"), t(s, "CAP"), t(s, "Comune"), t(s, "Provincia"), t(s, "Nazione")]
                 .filter(Boolean).join(", "),
      contact: "",
    };
  }

  function readFatturaPa(doc) {
    const r = doc.documentElement;
    const head = pick(r, "FatturaElettronicaHeader");
    const body = kids(r, "FatturaElettronicaBody")[0];
    const gen = pick(body, "DatiGenerali/DatiGeneraliDocumento");
    const lines = pickAll(body, "DatiBeniServizi/DettaglioLinee").map((l) => ({
      id: t(l, "NumeroLinea"), name: t(l, "Descrizione"), note: "",
      qty: t(l, "Quantita"), unit: t(l, "UnitaMisura"),
      price: t(l, "PrezzoUnitario"), vat: t(l, "AliquotaIVA"), total: t(l, "PrezzoTotale"),
    }));
    const taxes = pickAll(body, "DatiBeniServizi/DatiRiepilogo").map((s) => ({
      rate: t(s, "AliquotaIVA"), base: t(s, "ImponibileImporto"),
      tax: t(s, "Imposta"), code: t(s, "Natura"),
    }));
    const payable = t(gen, "ImportoTotaleDocumento") ||
      taxes.reduce((a, s) => a + (parseFloat(s.base) || 0) + (parseFloat(s.tax) || 0), 0).toFixed(2);
    return {
      kind: "Fattura elettronica",
      format: "FatturaPA (Italy)",
      number: t(gen, "Numero"), issued: t(gen, "Data"), due: firstOf(body, ["DatiPagamento/DettaglioPagamento/DataScadenzaPagamento"]),
      currency: t(gen, "Divisa") || "EUR",
      note: firstOf(gen, ["Causale"]),
      buyerRef: firstOf(head, ["DatiTrasmissione/ProgressivoInvio"]),
      seller: fpaParty(pick(head, "CedentePrestatore")),
      buyer: fpaParty(pick(head, "CessionarioCommittente")),
      lines, taxes,
      totals: {
        net: taxes.reduce((a, s) => a + (parseFloat(s.base) || 0), 0).toFixed(2),
        tax: taxes.reduce((a, s) => a + (parseFloat(s.tax) || 0), 0).toFixed(2),
        payable,
      },
      payment: {
        iban: firstOf(body, ["DatiPagamento/DettaglioPagamento/IBAN"]),
        bic: firstOf(body, ["DatiPagamento/DettaglioPagamento/BIC"]),
        reference: "", terms: firstOf(body, ["DatiPagamento/DettaglioPagamento/ModalitaPagamento"]),
      },
    };
  }

  // ---------- ISO 20022 camt.053 / camt.052 bank statement ----------
  function readCamt(doc) {
    const r = doc.documentElement;
    const stmt = pick(r, "BkToCstmrStmt/Stmt") || pick(r, "BkToCstmrAcctRpt/Rpt");
    if (!stmt) return null;
    const bals = kids(stmt, "Bal").map((b) => ({
      type: firstOf(b, ["Tp/CdOrPrtry/Cd", "Tp/CdOrPrtry/Prtry"]),
      amount: t(b, "Amt"),
      currency: (pick(b, "Amt") || {}).getAttribute ? pick(b, "Amt").getAttribute("Ccy") || "" : "",
      sign: t(b, "CdtDbtInd"),
      date: firstOf(b, ["Dt/Dt", "Dt/DtTm"]),
    }));
    const entries = kids(stmt, "Ntry").map((e) => {
      const dtl = pick(e, "NtryDtls/TxDtls");
      const cd = t(e, "CdtDbtInd");
      const partyName = firstOf(dtl, [
        "RltdPties/Cdtr/Nm", "RltdPties/Cdtr/Pty/Nm",
        "RltdPties/Dbtr/Nm", "RltdPties/Dbtr/Pty/Nm"]);
      return {
        booked: firstOf(e, ["BookgDt/Dt", "BookgDt/DtTm"]),
        value: firstOf(e, ["ValDt/Dt", "ValDt/DtTm"]),
        sign: cd,
        signed: (cd === "DBIT" ? "-" : "") + t(e, "Amt"),
        amount: t(e, "Amt"),
        currency: (pick(e, "Amt") || {}).getAttribute ? pick(e, "Amt").getAttribute("Ccy") || "" : "",
        counterparty: partyName,
        remittance: firstOf(dtl, ["RmtInf/Ustrd", "RmtInf/Strd/CdtrRefInf/Ref"]) ||
                    firstOf(e, ["AddtlNtryInf"]),
        reference: firstOf(e, ["AcctSvcrRef", "NtryRef"]) || firstOf(dtl, ["Refs/EndToEndId"]),
        code: firstOf(e, ["BkTxCd/Domn/Fmly/SubFmlyCd", "BkTxCd/Prtry/Cd"]),
        status: t(e, "Sts") || firstOf(e, ["Sts/Cd"]),
      };
    });
    return {
      kind: "Bank statement",
      format: "ISO 20022 " + (/camt\.052/i.test(r.namespaceURI || "") ? "camt.052" : "camt.053"),
      id: t(stmt, "Id"),
      created: firstOf(r, ["BkToCstmrStmt/GrpHdr/CreDtTm", "BkToCstmrAcctRpt/GrpHdr/CreDtTm"]),
      account: firstOf(stmt, ["Acct/Id/IBAN", "Acct/Id/Othr/Id"]),
      accountName: firstOf(stmt, ["Acct/Nm", "Acct/Ownr/Nm"]),
      currency: firstOf(stmt, ["Acct/Ccy"]),
      bank: firstOf(stmt, ["Acct/Svcr/FinInstnId/Nm", "Acct/Svcr/FinInstnId/BIC", "Acct/Svcr/FinInstnId/BICFI"]),
      from: firstOf(stmt, ["FrToDt/FrDtTm"]), to: firstOf(stmt, ["FrToDt/ToDtTm"]),
      balances: bals, entries,
    };
  }

  function read(doc) {
    const kind = detect(doc);
    if (!kind) return null;
    try {
      const data = kind === "ubl" ? readUbl(doc)
        : kind === "cii" ? readCii(doc)
        : kind === "fatturapa" ? readFatturaPa(doc)
        : kind === "ksef" ? readUbl(doc)
        : kind === "camt053" ? readCamt(doc)
        : null;
      if (!data) return null;
      data.type = kind;
      return data;
    } catch (e) {
      return null;
    }
  }

  Object.assign(XMLV, { detectDocument: detect, readDocument: read, _docHelpers: { ln, kids, pick, pickAll, t, firstOf, amount } });
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { detect, read, ln, kids, pick, pickAll };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
