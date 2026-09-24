"use strict";

const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "webapp", "localService", "mockdata");
const flows = JSON.parse(fs.readFileSync(path.join(dir, "DocumentFlowSet.json"), "utf8"));
const deliveries = JSON.parse(fs.readFileSync(path.join(dir, "OpenDeliverySet.json"), "utf8"));
const billings = JSON.parse(fs.readFileSync(path.join(dir, "BillingDocumentSet.json"), "utf8"));
const pipeline = JSON.parse(fs.readFileSync(path.join(dir, "PipelineByStageSet.json"), "utf8"));
const errors = [];

function fail(message) {
	errors.push(message);
}

if (!flows.length) {
	fail("Document flow is empty");
}

flows.forEach(function (flow) {
	if (flow.CompanyCodeName !== "Helvetia Motion AG") {
		fail(flow.DocumentFlowID + " is not Helvetia Motion AG");
	}
	if (!flow.Quotation) {
		fail(flow.DocumentFlowID + " has no quotation");
	}
	const chain = [flow.Quotation, flow.SalesOrder, flow.Delivery, flow.BillingDocument, flow.AccountingDocument];
	let seenBlank = false;
	chain.forEach(function (value, index) {
		if (!value) {
			seenBlank = true;
		} else if (seenBlank) {
			fail(flow.DocumentFlowID + " skips a document before step " + index);
		}
	});
	if (flow.AccountingDocument && flow.AccountingDocumentType !== "RV") {
		fail(flow.DocumentFlowID + " accounting document is not type RV");
	}
});

deliveries.forEach(function (delivery) {
	const flow = flows.find(function (item) { return item.Delivery === delivery.Delivery; });
	if (!flow || !flow.SalesOrder || !flow.Quotation) {
		fail("Open delivery " + delivery.Delivery + " is not linked to a quotation and order");
	}
	if (flow && (flow.BillingDocument || flow.AccountingDocument)) {
		fail("Open delivery " + delivery.Delivery + " already has billing or accounting");
	}
});

billings.forEach(function (billing) {
	const flow = flows.find(function (item) { return item.BillingDocument === billing.BillingDocument; });
	if (!flow || !flow.Quotation || !flow.SalesOrder || !flow.Delivery) {
		fail("Billing " + billing.BillingDocument + " is missing quotation, order, or delivery");
	}
	if (billing.AccountingStatus === "Posted" && !billing.AccountingDocument) {
		fail("Billing " + billing.BillingDocument + " is posted without an accounting document");
	}
});

const expectedStages = ["Quotation", "Order", "Delivery", "Billing", "Accounting"];
expectedStages.forEach(function (stage, index) {
	const row = pipeline.find(function (item) { return item.Stage === stage; });
	if (!row || row.StageSequence !== index + 1) {
		fail("Pipeline is missing stage " + stage);
	}
});

if (errors.length) {
	console.error(errors.join("\n"));
	process.exit(1);
}

console.log("Document flow check passed for " + flows.length + " Helvetia Motion AG chains.");
