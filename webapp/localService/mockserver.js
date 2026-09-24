sap.ui.define([
	"sap/ui/core/util/MockServer",
	"sap/base/Log"
], function (MockServer, Log) {
	"use strict";

	return {
		init: function () {
			if (this._bStarted) {
				return;
			}

			sap.ui.require(["sap/ui/fl/FakeLrepConnectorLocalStorage"], function (FakeLrepConnectorLocalStorage) {
				if (FakeLrepConnectorLocalStorage && FakeLrepConnectorLocalStorage.enableFakeConnector) {
					FakeLrepConnectorLocalStorage.enableFakeConnector();
				}
			});

			var sRoot = sap.ui.require.toUrl("mindtek/sales/overview/localService");
			var oMockServer = new MockServer({
				rootUri: "/sap/opu/odata/sap/SD_SALES_OVERVIEW_SRV/"
			});

			MockServer.config({
				autoRespond: true,
				autoRespondAfter: 40
			});

			oMockServer.simulate(sRoot + "/metadata.xml", {
				sMockdataBaseUrl: sRoot + "/mockdata",
				bGenerateMissingMockData: false
			});
			oMockServer.start();
			this._bStarted = true;
			Log.info("Sales Overview mock server started at /sap/opu/odata/sap/SD_SALES_OVERVIEW_SRV/");
		}
	};
});
