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
	const response = await Request.send("/api/reports/production_cost", "GET", {
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
  Show Overall Cost Chart
  */
	// get canvas for displaying chart
	const ctx = document.getElementById("overallCostChart");
	if (window.overallCostChartObj) window.overallCostChartObj.destroy();
	$("#overallCostChart").empty();

	const overallCostChartOptions = {
		type: "bar",
		data: {
			labels: Object.keys(data.timePeriodData),
			datasets: [
				{
					label: "Cost",
					data: Object.values(data.timePeriodData),
					backgroundColor: "rgb(54, 162, 235, 0.6)",
					borderWidth: 1,
				},
			],
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
							labelString: "Production Cost",
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
	window.overallCostChartObj = new Chart(ctx, overallCostChartOptions);
	window.overallCostChartOptions = overallCostChartOptions;

	/* 
  Show Material Cost Chart
  */
	// get canvas for displaying chart
	const ctx2 = document.getElementById("materialCostChart");
	if (window.materialCostChartObj) window.materialCostChartObj.destroy();
	$("#materialCostChart").empty();

	const materialCostChartx = [],
		materialCostCharty = [];

	data.materialCosts.forEach((m) => {
		materialCostChartx.push(`${m.material.name} (${m.material.code})`);
		materialCostCharty.push(m.cost);
	});

	const materialCostChartOptions = {
		type: "horizontalBar",
		data: {
			labels: materialCostChartx,
			datasets: [
				{
					label: "Cost",
					data: materialCostCharty,
					backgroundColor: "rgb(54, 162, 235, 0.6)",
					borderWidth: 1,
				},
			],
		},
		options: {
			scales: {
				yAxes: [
					{
						ticks: {
							beginAtZero: true,
							reverse: true,
						},
						scaleLabel: {
							display: true,
							labelString: "Material",
						},
					},
				],
				xAxes: [
					{
						scaleLabel: {
							display: true,
							labelString: `Cost (LKR)`,
						},
					},
				],
			},
		},
	};

	// create chart object
	window.materialCostChartObj = new Chart(ctx2, materialCostChartOptions);
	window.materialCostChartOptions = materialCostChartOptions;
};

const showTable = (data, reportType) => {
	// clear tables
	$("#overallCostTablePlaceholder").empty();
	$("#materialCostTablePlaceholder").empty();

	/**
	 * Overall cost table
	 */
	const reportTypeColumnName =
		reportType.charAt(0).toUpperCase() + reportType.slice(1);

	const overallCostTableHead = `
  <thead>
    <th>Index</th>
		<th>${reportTypeColumnName}</th>
		<th>Cost (LKR)</th>
  </head>
  `;

	let overallCostTableRows = "";

	// store total production cost
	let totalCost = 0;

	Object.keys(data.timePeriodData).forEach((i, index) => {
		const cost = data.timePeriodData[i] ? data.timePeriodData[i] : 0;
		overallCostTableRows += `
			<tr>
				<td>${index + 1}</td>
				<td>${i}</td>
				<td>${formatToLKR(cost)}</td>
			</tr>
		`;
		totalCost += parseFloat(cost);
	});

	const overallCostTable = `
		<h4>Overall costs</h4>
		<table id="overallCostTable" class="table table-bordered">
			${overallCostTableHead}
		<tbody>
			${overallCostTableRows}
			<tr style="background-color: #cccccc">
				<td><b>Total</b></td>
				<td></td>
				<td><b id="lblTotalCost">Rs. ${formatToLKR(totalCost)}</b></td>
			</tr>
		</tbody>
		</table>
	`;

	/**
	 * Material Cost Table
	 */
	const materialCostTableHead = `
  <thead>
    <th>Index</th>
		<th>Material</th>
		<th>Cost (LKR)</th>
  </head>
	`;

	let materialCostTableRows = ``;
	let totMaterialCost = 0;

	data.materialCosts.forEach((m, index) => {
		materialCostTableRows += `
			<tr>
				<td>${index + 1}</td>
				<td>${m.material.name} (${m.material.code})</td>
				<td>${formatToLKR(m.cost)}</td>
			<tr>
		`;
		totMaterialCost += parseFloat(m.cost);
	});

	const materialCostTable = `
	<h4>Material costs</h4>
	<table id="topPkgTable" class="table table-bordered">
	${materialCostTableHead}
	<tbody>
		${materialCostTableRows}
		<tr style="background-color: #cccccc">
			<td><b>Total</b></td>
			<td></td>
			<td><b id="lblTotalMaterialCost">Rs. ${formatToLKR(totMaterialCost)}</b></td>
		</tr>
	</tbody>
	</table>
`;

	$("#overallCostTablePlaceholder").html(overallCostTable);
	$("#materialCostTablePlaceholder").html(materialCostTable);
};

const printReport = async () => {
	const overallCostChartImg = document
		.getElementById("overallCostChart")
		.toDataURL();

	const materialCostChartImg = document
		.getElementById("materialCostChart")
		.toDataURL();

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
		overallCostChartImg: overallCostChartImg,
		materialCostChartImg: materialCostChartImg,
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
