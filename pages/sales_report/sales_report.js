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

	const salesChartOptions = {
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
	};

	// create chart object
	window.salesChartObj = new Chart(ctx, salesChartOptions);
	window.salesChartOptions = salesChartOptions;

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
		<th>Arrears</th>
  </head>
  `;

	let tbodyRows = "";

	let totTransactions = 0,
		totNetTotal = 0,
		totPayedAmount = 0,
		totArrearsAmount = 0;

	formattedData.entries.forEach((i, index) => {
		const transactions = parseInt(i.transactions),
			netTotal = parseFloat(i.netTotal),
			payedAmount = parseFloat(i.payedAmount),
			arrears = netTotal - payedAmount;

		tbodyRows += "<tr>";
		tbodyRows += `
      <td>${index + 1}</td>
			<td>${i[reportType]}</td>
      <td>${transactions}</td>
      <td>${formatToLKR(netTotal)}</td>
			<td>${formatToLKR(payedAmount)}</td>
			<td>${formatToLKR(arrears)}</td>
    `;
		tbodyRows += "</tr>";

		totTransactions += transactions;
		totNetTotal += netTotal;
		totPayedAmount += payedAmount;
		totArrearsAmount += arrears;
	});

	// add sum row
	tbodyRows += `
	<tr style="background-color: #cccccc">
		<td><b>Total</b></td>
		<td></td>
		<td><b id="lblTotSales">${totTransactions}</b></td>
		<td><b id="lblTotNetTotal">Rs. ${formatToLKR(totNetTotal)}</b></td>
		<td><b id="lblTotPayedAmount">Rs. ${formatToLKR(totPayedAmount)}</b></td>
		<td><b id="lblTotArrears">Rs. ${formatToLKR(totArrearsAmount)}</b></td>
	</tr>
	`;

	const tbody = `<tbody>${tbodyRows}</tbody>`;

	$("#salesTable").html(`${thead} ${tbody}`);
};

const printReport = async () => {
	const salesChartImg = document.getElementById("salesChart").toDataURL();

	// get report temple
	let template = await (await fetch("./print_template/print.html")).text();

	const employeeNumber = mainWindow.tempData.profile.employee.number;
	const employeeCallingName = mainWindow.tempData.profile.employee.callingName;

	// fill values
	const placeholderValues = {
		reportType: $("#cmbReportType option:selected").text(),
		startDate: $("#txtStartDate").val(),
		endDate: $("#txtEndDate").val(),
		totalSales: $("#lblTotSales").text(),
		netTotal: $("#lblTotNetTotal").text(),
		payedTotal: $("#lblTotPayedAmount").text(),
		arrearsTotal: $("#lblTotArrears").text(),
		salesTable: $("#tabTable").html(),
		genDateTime: moment().format("YYYY-MM-DD HH:mm:ss"),
		requestedEmployee: `${employeeCallingName} (${employeeNumber})`,
		salesChartImg: salesChartImg,
	};

	Object.keys(placeholderValues).forEach((key) => {
		template = template.replace(
			new RegExp(`#{${key}}`, "g"),
			placeholderValues[key]
		);
	});

	const win = window.open("", "Print", "width=1000,height=600");
	win.document.write(template);
	setTimeout(() => {});
};
