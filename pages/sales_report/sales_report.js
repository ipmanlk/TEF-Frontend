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

	/* 
  Show Sales Income Chart
  */
	const ctx2 = document.getElementById("salesIncomeChart");
	if (window.salesIncomeChartObj) window.salesIncomeChartObj.destroy();
	$("#salesIncomeChart").empty();

	let totNetTotal = 0,
		totPayedAmount = 0;

	formattedData.entries.forEach((i) => {
		totNetTotal += parseFloat(i.netTotal);
		totPayedAmount += parseFloat(i.payedAmount);
	});

	// calculate percentages
	const sum = totNetTotal;
	const perPayedAmount = ((totPayedAmount / sum) * 100).toFixed(2);
	const perArrearsAmount = (
		((totNetTotal - totPayedAmount) / sum) *
		100
	).toFixed(2);

	// create chart object
	window.salesIncomeChartObj = new Chart(ctx2, {
		type: "pie",
		data: {
			labels: ["Payed Amount (%)", "Arrears Amount (%)"],
			datasets: [
				{
					data: [perPayedAmount, perArrearsAmount],
					backgroundColor: ["rgb(75, 192, 192, 0.8)", "rgb(255, 99, 132, 0.8)"],
				},
			],
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
		<th>Count</th>
    <th>Net Total</th>
    <th>Payed Amount</th>
  </head>
  `;

	let tbodyRows = "";

	let totTransactions = 0,
		totNetTotal = 0,
		totPayedAmount = 0;

	formattedData.entries.forEach((i, index) => {
		tbodyRows += "<tr>";
		tbodyRows += `
      <td>${index + 1}</td>
			<td>${i[reportType]}</td>
      <td>${i.transactions}</td>
      <td>${i.netTotal}</td>
      <td>${i.payedAmount}</td>
    `;
		tbodyRows += "</tr>";

		totTransactions += parseInt(i.transactions);
		totNetTotal += parseFloat(i.netTotal);
		totPayedAmount += parseFloat(i.payedAmount);
	});

	// add sum row
	tbodyRows += `
	<tr style="background-color: #cccccc">
		<td><b>Total</b></td>
		<td></td>
		<td><b>${totTransactions}</b></td>
		<td><b>Rs. ${formatToLKR(totNetTotal)}</b></td>
		<td><b>Rs. ${formatToLKR(totPayedAmount)}</b></td>
	</tr>
	
	<tr style="background-color: #cccccc">
		<td><b>Total Arrears</b></td>
		<td></td>
		<td></td>
		<td></td>
		<td><b>Rs. ${formatToLKR(totNetTotal - totPayedAmount)}</b></td>
	</tr>
	`;

	const tbody = `<tbody>${tbodyRows}</tbody>`;

	$("#salesTable").html(`${thead} ${tbody}`);
};
