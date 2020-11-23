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
		showReport();
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

	if (start == "" && end == "") {
		mainWindow.showOutputModal(
			"Sorry!",
			`Please select start and end ${reportType}s first!`
		);
		return;
	}

	// send a request and grab all the data
	const response = await Request.send("/api/reports/sales", "GET", {
		data: { start: start, end: end, type: reportType },
	});

	if (!response.status) return;

	// data received from the server.
	const data = response.data;

	// get those data formatted for chat.js
	const formattedData = formatData(data, reportType);

	showCharts(formattedData, reportType);
	showTable(formattedData, reportType);
};

const formatData = (data, reportType) => {
	let formattedData;

	const entries = [],
		x = [],
		y = [];

	switch (reportType) {
		case "today":
			data.forEach((i) => {
				const entry = {
					today: moment(i.sales_date).format("YYYY-MM-DD"),
					netTotal: i.net_total,
					payedAmount: i.payed_amount,
					transactions: i.transactions,
				};
				entries.push(entry);
				x.push(entry.today);
				y.push(entry.transactions);
			});
			formattedData = { entries, x, y };
			break;
		case "day":
			data.forEach((i) => {
				const entry = {
					day: moment(i.sales_date).format("YYYY-MM-DD"),
					netTotal: i.net_total,
					payedAmount: i.payed_amount,
					transactions: i.transactions,
				};
				entries.push(entry);
				x.push(entry.day);
				y.push(entry.transactions);
			});
			formattedData = { entries, x, y };
			break;
		case "week":
			data.forEach((i) => {
				const entry = {
					week: `${moment(i.week_beginning).format("YYYY-MM-DD")}-${moment(
						i.week_beginning
					)
						.add(6, "days")
						.format("YYYY-MM-DD")}`,
					netTotal: i.net_total,
					payedAmount: i.payed_amount,
					transactions: i.transactions,
				};
				entries.push(entry);
				x.push(entry.week);
				y.push(entry.transactions);
			});
			formattedData = { entries, x, y };
			break;
		case "month":
			data.forEach((i) => {
				const entry = {
					month: moment(i.month_beginning).format("YYYY-MM"),
					netTotal: i.net_total,
					payedAmount: i.payed_amount,
					transactions: i.transactions,
				};
				entries.push(entry);
				x.push(entry.month);
				y.push(entry.transactions);
			});
			formattedData = { entries, x, y };
			break;
		case "year":
			data.forEach((i) => {
				const entry = {
					year: i.year,
					netTotal: i.net_total,
					payedAmount: i.payed_amount,
					transactions: i.transactions,
				};
				entries.push(entry);
				x.push(entry.year);
				y.push(entry.transactions);
			});
			formattedData = { entries, x, y };
			break;
	}
	return formattedData;
};

const showCharts = (formattedData, reportType) => {
	// make first char of reportType to upper
	const xLabelName = reportType.charAt(0).toUpperCase() + reportType.slice(1);

	/* 
  Show Sales Chart 
  */
	// get canvas for displaying chart
	const ctx = document.getElementById("salesChart");
	if (window.salesChartObj) window.salesChartObj.destroy();
	$("#salesChart").empty();
	// create chart object
	window.salesChartObj = new Chart(ctx, {
		type: "bar",
		data: {
			labels: formattedData.x,
			datasets: [
				{
					label: "No of Sales",
					data: formattedData.y,
					backgroundColor: "rgba(54, 162, 235, 0.2)",
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
							labelString: "Sales",
						},
					},
				],
				xAxes: [
					{
						scaleLabel: {
							display: true,
							labelString: `${xLabelName}s`,
						},
					},
				],
			},
		},
	});
};

const showTable = (formattedData, reportType) => {
	const reportTypeColumnName =
		reportType.charAt(0).toUpperCase() + reportType.slice(1);

	// clear table
	$("#salesTable").empty();

	const thead = `
  <thead>
    <th>Index</th>
    <th>${reportTypeColumnName}</th>
    <th>Net Total</th>
    <th>Payed Amount</th>
  </head>
  `;

	let tbodyRows = "";

	formattedData.entries.forEach((i, index) => {
		tbodyRows += "<tr>";
		tbodyRows += `
      <td>${index + 1}</td>
      <td>${i[reportType]}</td>
      <td>${i.netTotal}</td>
      <td>${i.payedAmount}</td>
    `;
		tbodyRows += "</tr>";
	});

	const tbody = `<tbody>${tbodyRows}</tbody>`;

	$("#salesTable").html(`${thead} ${tbody}`);
};
