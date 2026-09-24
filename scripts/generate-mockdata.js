"use strict";

const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "webapp", "localService", "mockdata");
const COMPANY = "HM01";
const COMPANY_NAME = "Helvetia Motion AG";
const SALES_ORG = "HM10";
const SALES_ORG_NAME = "Motion Switzerland";
const CURRENCY = "CHF";

const customers = [
	["100001", "Stadler Rail AG"],
	["100002", "Bühler AG"],
	["100003", "Schindler Aufzüge AG"],
	["100004", "Pilatus Aircraft Ltd"],
	["100005", "Roche Diagnostics AG"],
	["100006", "ABB Schweiz AG"],
	["100007", "Geberit International AG"],
	["100008", "Sika AG"],
	["100009", "Endress+Hauser Flowtec AG"],
	["100010", "Liebherr Machines Bulle SA"]
];

const materials = [
	["HM-SRV-440", "Servo Drive 440V", 18400],
	["HM-LIN-220", "Linear Actuator 220", 9600],
	["HM-CTL-100", "Motion Controller", 12850],
	["HM-ENC-32", "Encoder Kit", 2140],
	["HM-CAB-PWR", "Power Cable Set", 640]
];

function dateMs(year, month, day) {
	return Date.UTC(year, month - 1, day);
}

function odataDate(ms) {
	return "/Date(" + ms + ")/";
}

function money(n) {
	return n.toFixed(2);
}

function pad(n, width) {
	return String(n).padStart(width, "0");
}

const stages = ["Quotation", "Order", "Delivery", "Billing", "Accounting"];
const flows = [];

customers.forEach(function (customer, index) {
	const material = materials[index % materials.length];
	const qty = 2 + (index % 5);
	const net = qty * material[2];
	const year = index < 4 ? 2025 : 2026;
	const month = ((index * 2) % 12) + 1;
	const day = 4 + (index % 20);
	const depth = [0, 1, 2, 3, 4, 4, 4, 4, 2, 0][index];
	const quotation = "200" + pad(index + 1, 5);
	const order = depth >= 1 ? "300" + pad(index + 1, 5) : "";
	const delivery = depth >= 2 ? "800" + pad(index + 1, 5) : "";
	const billing = depth >= 3 ? "900" + pad(index + 1, 5) : "";
	const accounting = depth >= 4 ? "140000" + pad(index + 1, 4) : "";
	const quoteMs = dateMs(year, month, day);
	const orderMs = depth >= 1 ? dateMs(year, month, Math.min(day + 3, 28)) : null;
	const deliveryMs = depth >= 2 ? dateMs(year, month, Math.min(day + 10, 28)) : null;
	const billingMs = depth >= 3 ? dateMs(year, month, Math.min(day + 14, 28)) : null;
	const status = depth === 0 ? "Quotation open"
		: depth === 1 ? "Order open"
		: depth === 2 ? "Delivery open"
		: depth === 3 ? "Billed, not posted"
		: "Posted to accounting";

	flows.push({
		DocumentFlowID: pad(index + 1, 10),
		CompanyCode: COMPANY,
		CompanyCodeName: COMPANY_NAME,
		SalesOrganization: SALES_ORG,
		SalesOrganizationName: SALES_ORG_NAME,
		DistributionChannel: index % 2 === 0 ? "10" : "20",
		Division: pad((index % 3) + 1, 2),
		FiscalYear: String(year),
		Customer: customer[0],
		CustomerName: customer[1],
		Material: material[0],
		MaterialName: material[1],
		Quotation: quotation,
		QuotationDate: odataDate(quoteMs),
		QuotationNetAmount: money(net),
		SalesOrder: order,
		SalesOrderDate: orderMs ? odataDate(orderMs) : null,
		OrderNetAmount: order ? money(net) : "0.00",
		Delivery: delivery,
		DeliveryDate: deliveryMs ? odataDate(deliveryMs) : null,
		BillingDocument: billing,
		BillingDate: billingMs ? odataDate(billingMs) : null,
		BillingNetAmount: billing ? money(net) : "0.00",
		AccountingDocument: accounting,
		AccountingDocumentType: accounting ? "RV" : "",
		FiscalYearAccounting: accounting ? String(year) : "",
		Currency: CURRENCY,
		FlowStatus: status,
		OverallNetAmount: money(net),
		StageDepth: depth,
		NetNumber: net,
		Month: month,
		Year: year
	});
});

const salesByMonth = [];
[2025, 2026].forEach(function (year) {
	for (let month = 1; month <= 12; month++) {
		const billed = flows
			.filter(function (flow) { return flow.Year === year && flow.Month === month && flow.StageDepth >= 3; })
			.reduce(function (sum, flow) { return sum + flow.NetNumber; }, 0);
		const base = billed || (18000 + month * 2400 + (year === 2026 ? 8000 : 0));
		salesByMonth.push({
			ID: year + "-" + pad(month, 2),
			CompanyCode: COMPANY,
			CompanyCodeName: COMPANY_NAME,
			SalesOrganization: SALES_ORG,
			SalesOrganizationName: SALES_ORG_NAME,
			FiscalYear: String(year),
			FiscalPeriod: pad(month, 3),
			PeriodName: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1],
			NetAmount: money(base),
			Currency: CURRENCY
		});
	}
});

const pipeline = stages.map(function (stage, depth) {
	const matching = flows.filter(function (flow) { return flow.StageDepth === depth && flow.Year === 2026; });
	const net = matching.reduce(function (sum, flow) { return sum + flow.NetNumber; }, 0);
	return {
		ID: "2026-" + pad(depth + 1, 2),
		CompanyCode: COMPANY,
		SalesOrganization: SALES_ORG,
		FiscalYear: "2026",
		Stage: stage,
		StageSequence: depth + 1,
		DocumentCount: matching.length,
		NetAmount: money(net),
		Currency: CURRENCY
	};
});

function kpi(id, name, value) {
	return {
		ID: id,
		CompanyCode: COMPANY,
		SalesOrganization: SALES_ORG,
		FiscalYear: "2026",
		KpiName: name,
		KpiValue: money(value),
		Currency: CURRENCY
	};
}

const openQuotationValue = flows
	.filter(function (flow) { return flow.Year === 2026 && flow.StageDepth === 0; })
	.reduce(function (sum, flow) { return sum + flow.NetNumber; }, 0);
const orderBacklog = flows
	.filter(function (flow) { return flow.Year === 2026 && flow.StageDepth >= 1 && flow.StageDepth <= 2; })
	.reduce(function (sum, flow) { return sum + flow.NetNumber; }, 0);

const salesKpi = [
	kpi("OPEN_QT", "Open quotations", openQuotationValue),
	kpi("BACKLOG", "Order backlog", orderBacklog)
];

const openDeliveries = flows
	.filter(function (flow) { return flow.StageDepth === 2; })
	.map(function (flow) {
		return {
			Delivery: flow.Delivery,
			CompanyCode: COMPANY,
			SalesOrganization: SALES_ORG,
			FiscalYear: flow.FiscalYear,
			SalesOrder: flow.SalesOrder,
			Quotation: flow.Quotation,
			Customer: flow.Customer,
			CustomerName: flow.CustomerName,
			PlannedGoodsIssueDate: flow.DeliveryDate,
			DeliveryStatus: "Goods issue open",
			NetAmount: flow.OverallNetAmount,
			Currency: CURRENCY
		};
	});

const billingDocuments = flows
	.filter(function (flow) { return flow.StageDepth >= 3; })
	.map(function (flow) {
		const tax = flow.NetNumber * 0.081;
		return {
			BillingDocument: flow.BillingDocument,
			CompanyCode: COMPANY,
			SalesOrganization: SALES_ORG,
			FiscalYear: flow.FiscalYear,
			Quotation: flow.Quotation,
			SalesOrder: flow.SalesOrder,
			Delivery: flow.Delivery,
			AccountingDocument: flow.AccountingDocument,
			Customer: flow.Customer,
			CustomerName: flow.CustomerName,
			BillingDate: flow.BillingDate,
			NetAmount: flow.BillingNetAmount,
			TaxAmount: money(tax),
			Currency: CURRENCY,
			AccountingStatus: flow.AccountingDocument ? "Posted" : "Not posted"
		};
	});

const documentFlows = flows.map(function (flow) {
	const copy = Object.assign({}, flow);
	copy.DocumentChain = [flow.Quotation, flow.SalesOrder, flow.Delivery, flow.BillingDocument, flow.AccountingDocument]
		.filter(Boolean)
		.join(" → ");
	delete copy.StageDepth;
	delete copy.NetNumber;
	delete copy.Month;
	delete copy.Year;
	return copy;
});

const files = {
	"DocumentFlowSet.json": documentFlows,
	"SalesByMonthSet.json": salesByMonth,
	"PipelineByStageSet.json": pipeline,
	"SalesKpiSet.json": salesKpi,
	"OpenDeliverySet.json": openDeliveries,
	"BillingDocumentSet.json": billingDocuments,
	"CompanyCodeSet.json": [{
		CompanyCode: COMPANY,
		CompanyCodeName: COMPANY_NAME,
		CityName: "Baden",
		Country: "CH",
		Currency: CURRENCY
	}],
	"SalesOrganizationSet.json": [{
		SalesOrganization: SALES_ORG,
		SalesOrganizationName: SALES_ORG_NAME,
		CompanyCode: COMPANY
	}],
	"SalesFilterSet.json": [{
		ID: "HM01-2026",
		CompanyCode: COMPANY,
		SalesOrganization: SALES_ORG,
		FiscalYear: "2026"
	}]
};

fs.mkdirSync(outDir, { recursive: true });
Object.keys(files).forEach(function (name) {
	fs.writeFileSync(path.join(outDir, name), JSON.stringify(files[name], null, "\t") + "\n");
});

console.log("Wrote " + Object.keys(files).length + " mock entity sets to " + outDir);
