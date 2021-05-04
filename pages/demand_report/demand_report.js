function loadModule(permissionStr) {
	// get roles
	const roles = mainWindow.tempData.profile.userRoles;

	if (roles.length == 0 && roles[0].name.toLowerCase() == "cashier") {
		// only display today report for cashiers
	}

	registerEventListeners();
	// set initial report type to today
	setReportType("today");
}

const registerEventListeners = () => {
	$("#btnViewReport").click(() => {
		const startDate = $("#txtStartDate").val().trim();
		const endDate = $("#txtEndDate").val().trim();
		const reportType = $("#cmbReportType").val();

		// check if start and end durations are selected or not
		if (startDate == "" || endDate == "") {
			mainWindow.showOutputModal(
				"Sorry!",
				`Please select start and end ${reportType}s first!`
			);
			return;
		}

		// check for future dates
		const today = new Date();
		const dtStartDate = new Date(startDate);
		const dtEndDate = new Date(endDate);

		today.setHours(0, 0, 0, 0);
		dtStartDate.setHours(0, 0, 0, 0);
		dtEndDate.setHours(0, 0, 0, 0);

		if (today < dtStartDate || today < dtEndDate) {
			mainWindow.showOutputModal(
				"Sorry!",
				"You can't select future dates for start and end."
			);
			return;
		}

		if (dtStartDate > dtEndDate) {
			mainWindow.showOutputModal(
				"Sorry!",
				"End date can't be older than the start date."
			);
			return;
		}

		showReport();
	});

	$("#btnPrintReport").click(() => {
		printReport();
	});

	// report type change
	$("#cmbReportType").on("change", function () {
		const reportType = $("#cmbReportType").val();
		setReportType(reportType);
	});
};

const setReportType = (reportType) => {
	// figure out correct input type for date inputs
	let inputType;
	if (reportType == "year") {
		inputType = "number";
	} else if (reportType == "day") {
		inputType = "date";
	} else {
		inputType = reportType;
	}

	if (reportType == "today") {
		$("#lblStartDate").text("Start Date: ");
		$("#lblEndDate").text("End Date: ");
		// set input type to date
		$("#txtStartDate, #txtEndDate").attr("type", "date");
		$("#txtStartDate, #txtEndDate").val(new Date().formatForInput());
		$("#txtStartDate, #txtEndDate").attr("disabled", true);
	} else {
		// set input type according to report type
		$("#txtStartDate, #txtEndDate").attr("type", inputType);
		// make first character of report type uppercase to use as a label
		const labelType = reportType.charAt(0).toUpperCase() + reportType.slice(1);
		// set labels
		$("#lblStartDate").text(`Start ${labelType}: `);
		$("#lblEndDate").text(`End ${labelType}: `);
		$("#txtStartDate, #txtEndDate").attr("disabled", false);
	}
};

const showReport = async () => {
	const start = $("#txtStartDate").val().trim();
	const end = $("#txtEndDate").val().trim();

	const reportType = $("#cmbReportType").val();

	// send a request and grab all the data
	const response = await Request.send("/api/reports/demand", "GET", {
		data: { start: start, end: end, type: reportType },
	});

	if (!response.status) return;

	// data received from the server.
	const data = response.data;

	// if there aren't any records
	if (data.length == 0) {
		mainWindow.showOutputModal(
			"Sorry!",
			"There aren't any sales happened during the selected time period."
		);
		$("#outputContainer").fadeOut();
		return;
	}

	// display output container
	$("#outputContainer").fadeIn();

	showCharts(data, reportType);
	showTable(data, reportType);
};

const showCharts = (data, reportType) => {
	// make first char of reportType to upper
	const xLabelName = reportType.charAt(0).toUpperCase() + reportType.slice(1);

	/* 
  Show Sales Chart 
  */
	// get canvas for displaying chart
	const ctx = document.getElementById("demandChart");
	if (window.demandChartObj) window.demandChartObj.destroy();
	$("#demandChart").empty();

	const keys = Object.keys(data);

	// generate datasets
	const preSets = {};

	// format data appropriately
	keys.forEach((k, index) => {
		const kValues = data[k];

		kValues.forEach((i) => {
			if (preSets[i.id]) {
				preSets[i.id]["data"][index] = i.qty;
			} else {
				const d = {
					data: [],
					label: `${i.name} (${i.code})`,
					borderColor: getRandomColor(),
					fill: false,
				};
				d.data[index] = i.qty;
				preSets[i.id] = d;
			}
		});
	});

	// fill empty values with 0 and make all data arrays equal length
	const xLength = keys.length; // length of x labels

	const datasets = Object.values(preSets).map((ps) => {
		ps.data = Array.from(ps.data, (i) => i || 0);
		// already max length
		if (ps.data.length == xLength) return ps;
		// if not, make length equal
		for (let i = 0; i < xLength; i++) {
			if (!ps.data[i]) ps.data[i] = 0;
		}
		return ps;
	});

	const demandChartChartOptions = {
		type: "line",
		data: {
			labels: keys,
			datasets: datasets,
		},
		options: {
			scales: {
				yAxes: [
					{
						ticks: {
							beginAtZero: true,
						},
						scaleLabel: {
							display: true,
							labelString: "Quantity",
						},
					},
				],
				xAxes: [
					{
						scaleLabel: {
							display: true,
							labelString: `${xLabelName}`,
						},
					},
				],
			},
		},
	};

	// create chart object
	window.demandChartObj = new Chart(ctx, demandChartChartOptions);
	window.demandChartOptions = demandChartChartOptions;
};

const showTable = (data, reportType) => {
	// stores Qtys for showing top items
	let productPkgQtys = {};

	/**
	 * Demand table
	 */
	const reportTypeColumnName =
		reportType.charAt(0).toUpperCase() + reportType.slice(1);

	// clear table
	$("#demandTable").empty();

	const demandTableThead = `
  <thead>
    <th>Index</th>
		<th>${reportTypeColumnName}</th>
		<th>Product Package</th>
		<th>Quantity</th>
  </head>
  `;

	let demandTableTbodyRows = "";

	const keys = Object.keys(data);

	keys.forEach((k, index) => {
		const keyValues = data[k];
		// use key (a date) as the column group name
		let rowGroupName = k;

		keyValues.forEach((i) => {
			demandTableTbodyRows += "<tr>";
			demandTableTbodyRows += `
				<td>${rowGroupName != "" ? index + 1 : ""}</td>
				<td>${rowGroupName}</td>
				<td>${i.name} (${i.code})</td>
				<td>${i.qty}</td>
			`;
			demandTableTbodyRows += "</tr>";

			rowGroupName = "";

			// save info for later calculations
			if (productPkgQtys[i.id]) {
				productPkgQtys[i.id]["qty"] += i.qty;
			} else {
				productPkgQtys[i.id] = i;
			}
		});
	});

	const demandTable = `
		<h4>Detailed information on demands</h4>
		<table id="demandTable" class="table table-bordered">
		${demandTableThead}<tbody>${demandTableTbodyRows}</tbody>
		</table>
	`;

	/**
	 * Top Product Pkgs Table
	 */

	// convert to array (from mapped by id object)
	productPkgQtys = Object.values(productPkgQtys);

	// sort productPkgQtys desc order
	productPkgQtys.sort((a, b) => {
		if (b.qty < a.qty) {
			return -1;
		}
		if (b.qty > a.qty) {
			return 1;
		}
		return 0;
	});

	// build table
	const topPkgTableThead = `
  <thead>
    <th>Index</th>
		<th>Product Package</th>
		<th>Qty</th>
  </head>
	`;

	let topPkgTableRows = ``;

	productPkgQtys.every((i, index) => {
		topPkgTableRows += `
		<tr>
		<td>${index + 1}</td>
		<td>${i.name} (${i.code})</td>
		<td>${i.qty}</td>
		</tr>
	`;
		return index != 4;
	});

	const topPkgTable = `
	<h4>Most demanded product packages</h4>
	<table id="topPkgTable" class="table table-bordered">
	${topPkgTableThead}<tbody>${topPkgTableRows}</tbody>
	</table>
`;

	$("#topPkgTablePlaceholder").html(topPkgTable);
	$("#demandTablePlaceholder").html(demandTable);
};

const printReport = async () => {
	const demandChartImg = document.getElementById("demandChart").toDataURL();

	// get report temple
	let template = await (await fetch("./print_template/print.html")).text();

	const employeeNumber = mainWindow.tempData.profile.employee.number;
	const employeeCallingName = mainWindow.tempData.profile.employee.callingName;

	// fill values
	const placeholderValues = {
		reportType: $("#cmbReportType option:selected").text(),
		startDate: $("#txtStartDate").val(),
		endDate: $("#txtEndDate").val(),
		tables: $("#tabTable").html(),
		genDateTime: moment().format("YYYY-MM-DD HH:mm:ss"),
		requestedEmployee: `${employeeCallingName} (${employeeNumber})`,
		demandChartImg: demandChartImg,
	};

	Object.keys(placeholderValues).forEach((key) => {
		template = template.replace(
			new RegExp(`#{${key}}`, "g"),
			placeholderValues[key]
		);
	});

	const win = window.open("", "Print", "width=1000,height=600");
	win.document.write(template);
	setTimeout(() => {
		win.print();
		win.close();
	}, 500);
};

const generatedColors = [];

function getRandomColor() {
	var letters = "0123456789ABCDEF";
	var color = "#";
	for (var i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	if (generatedColors.includes(color)) {
		getRandomColor();
	} else {
		generatedColors.push(color);
		return color;
	}
}
