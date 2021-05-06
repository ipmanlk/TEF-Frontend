// colors for tiles
const colors = [
	"#2e8bcc",
	"#339933",
	"#e51400",
	"#7b4f9d",
	"#9b59b6",
	"#d35400",
	"#c0392b",
	"#00aba9",
];

// tile info
const tileInfo = {
	EMPLOYEE: { title: "Employee", icon: "fa-address-card" },
	USER: { title: "User", icon: "fa-users" },
	DESIGNATION: { title: "Designation", icon: "fa-sitemap" },
	EMPLOYEE_STATUS: {
		title: "Employee Status",
		icon: "fa-handshake-o",
	},
	PRIVILEGE: { title: "Privilege", icon: "fa-lock" },
	ROLE: { title: "Role", icon: "fa-user-circle" },
	MATERIAL: { title: "Material", icon: "fa-th-large" },
	SUPPLIER: { title: "Supplier", icon: "fa-truck" },
	SUPPLIER_MATERIAL: {
		title: "Supplier Material",
		icon: "fa-bitbucket",
	},
	PRODUCT: { title: "Product", icon: "fa-cube" },
	PRODUCT_PACKAGE: { title: "Product Package", icon: "fa-cubes" },
	MATERIAL_ANALYSIS: {
		title: "Material Analysis",
		icon: "fa-connectdevelop",
	},
	PRODUCT_PACKAGE_COST_ANALYSIS: {
		title: "Product Package Cost Analysis",
		icon: "fa-connectdevelop",
	},
	QUOTATION_REQUEST: {
		title: "Quotation Request",
		icon: " fa-file-text-o",
	},
	QUOTATION: { title: "Quotation", icon: "fa-file-text-o" },
	MATERIAL_INVENTORY: {
		title: "Material Inventory",
		icon: "fa-braille",
	},
	PURCHASE_ORDER: { title: "Purchase Order", icon: "fa-file-text-o" },
	CUSTOMER: { title: "Customer", icon: "fa-male" },
	GRN: { title: "GRN", icon: "fa-file-text-o" },
	SUPPLIER_PAYMENT: {
		title: "Supplier Payment",
		icon: "fa-file-text-o",
	},
	CUSTOMER_ORDER: { title: "Customer Order", icon: "fa-file-text-o" },
	CUSTOMER_INVOICE: {
		title: "Customer Invoice",
		icon: "fa-file-text-o",
	},
	PRODUCTION_ORDER: {
		title: "Production Order",
		icon: "fa-file-text-o",
	},
	PRODUCTION_ORDER_CONFIRM: {
		title: "Production Order Confirm",
		icon: "fa-file-text-o",
	},
	PRODUCTION_INVENTORY: {
		title: "Production Inventory",
		icon: "fa-th",
	},
	SALES_REPORT: { title: "Sales Report", icon: "fa-line-chart" },
	DEMAND_REPORT: { title: "Demand Report", icon: "fa-line-chart" },
	PRODUCTION_COST_REPORT: {
		title: "Production Cost Report",
		icon: "fa-line-chart",
	},
	REVENUE_REPORT: {
		title: "Revenue Report",
		icon: "fa-line-chart",
	},
};

$(document).ready(() => {
	// event listener for filtering cards
	$("#txtFilterCards").on("keyup change", (e) => {
		const keyword = e.target.value.trim().toLowerCase();

		// when keyword is empty
		if (keyword.trim() == "") {
			$(".TILE").show();
			return;
		}

		$(".TILE").each((i, tile) => {
			// check h1 text inside tile
			const tileText = $(tile).first().first().first().text().toLowerCase();
			if (tileText.indexOf(keyword) > -1) {
				$(tile).show();
			} else {
				$(tile).hide();
			}
		});
	});
});

// this function will be called from router.js upon loading dashboard
function updateTiles() {
	// show hide tiles based on privileges
	const privileges = mainWindow.tempData.privileges;

	// clear tile list
	$("#tileList").empty();

	// show tiles based on privileges
	Object.keys(privileges).forEach((module, index) => {
		// check if user has read permisison
		if (privileges[module].split("")[1] != 1) {
			return;
		}

		// get random color for tile
		const color = colors[Math.floor(Math.random() * colors.length)];

		try {
			// append tile
			const tile = `
		<div class="card TILE ${module}" style="background-color: ${color}; opacity: 0.8;" onclick="mainWindow.loadRoute('${module.toLowerCase()}')">
				<div class="card-body text-center">
						<h1>${tileInfo[module].title}</h1>
						<i class="fa fa-3x ${tileInfo[module].icon}"></i>
				</div>
		</div>
		`;

			$("#tileList").append(tile);
		} catch (e) {
			return;
		}
	});

	// update right sidebar and calenders
	updateSideBar().catch((e) => {
		console.log(e);
	});
}

const updateSideBar = async () => {
	// get the role name sof logged in user
	const userRoles = mainWindow.tempData.profile.userRoles.map((ur) => ur.name);

	const response = await (await fetch("/api/summery/dashboard")).json();

	const {
		lowMaterials,
		lowProductPackages,
		cheques,
		customerOrders,
		productionOrders,
	} = response.data;

	// show list box stuff
	if (
		lowMaterials.length != 0 &&
		checkRoles(userRoles, [
			"Admin",
			"Owner",
			"Factory Manager",
			"Factory Supervisor",
			"Assistant Factory Manager",
		])
	) {
		$("#cardLowMaterialsList").empty();
		lowMaterials.forEach((m) => {
			$("#cardLowMaterialsList").append(`
				<a href="/?page=material_inventory" target="_blank" class="list-group-item">
					${m.material.name} (${m.material.code})
				</a>
			`);
		});
	} else {
		$("#cardLowMaterials").hide();
	}

	if (
		lowProductPackages.length != 0 &&
		checkRoles(userRoles, ["Admin", "Owner", "Shop Manager"])
	) {
		$("#cardLowProductPackagesList").empty();
		lowProductPackages.forEach((i) => {
			$("#cardLowProductPackagesList").append(`
				<a href="/?page=production_inventory" target="_blank" class="list-group-item">
					${i.productPackage.name} (${i.productPackage.code})
				</a>
			`);
		});
	} else {
		$("#cardLowProductPackages").hide();
	}

	// show calender stuff
	const calenderEvents = [];

	if (
		checkRoles(userRoles, [
			"Admin",
			"Owner",
			"Shop Manager",
			"Assistant Shop Manager",
		])
	) {
		cheques.forEach((i) => {
			calenderEvents.push({
				date: new Date(i.chequeDate).getTime().toString(),
				type: "deposit",
				title: `Cheque Deposit: No-${i.chequeNo} (From Invoice: ${i.code})`,
				description: "You have to deposit this cheque on this day.",
				url: `/?page=customer_invoice&show=${i.id}`,
			});
		});
	}

	if (
		checkRoles(userRoles, [
			"Admin",
			"Owner",
			"Shop Manager",
			"Assistant Shop Manager",
			"Cashier",
		])
	) {
		customerOrders.forEach((i) => {
			calenderEvents.push({
				date: new Date(i.requiredDate).getTime().toString(),
				type: "order",
				title: `Customer Order: ${i.cocode} (From: ${i.customer.customerName}-${i.customer.number})`,
				description: "You have to deliver this order on this day.",
				url: `http://localhost:3000/?page=customer_order&show=${i.id}`,
			});
		});
	}

	if (
		checkRoles(userRoles, [
			"Admin",
			"Owner",
			"Factory Manager",
			"Factory Supervisor",
		])
	) {
		productionOrders.forEach((i) => {
			calenderEvents.push({
				date: new Date(i.requiredDate).getTime().toString(),
				type: "order",
				title: `Production Order: ${i.code} (From: ${i.employee.callingName}-${i.employee.number})`,
				description: "You have to deliver this order on this day.",
				url: `http://localhost:3000/?page=production_order_confirm&show=${i.id}`,
			});
		});
	}

	$("#eventCalendar").eventCalendar({
		jsonData: calenderEvents,
		dateFormat: "dddd MM-D-YYYY",
		eventsLimit: 5,
		openEventInNewWindow: true,
	});
};

// find if at least one of given array elements are included in an another array
const checkRoles = (userRoles = [], allowedRoles = []) => {
	let isAllowed = false;

	allowedRoles.every((roleName) => {
		if (userRoles.includes(roleName)) {
			isAllowed = true;
			return false;
		}
		return true;
	});

	return isAllowed;
};
