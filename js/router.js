// load routes
const loadRoute = (route, optionParams = "") => {
	let routes = getRoutes();

	// if route doesn't exist
	if (!routes[route]) {
		window.alert("This route doesnt exist (404)");
		window.location = "/index.html?page=dashboard";
		return;
	}

	const frame = $("#iframeMain")[0];
	frame.contentWindow.location.replace(routes[route].path + optionParams);

	// hide open modals
	$(".modal").modal("hide");

	// scroll to top
	$("html, body").animate({ scrollTop: 0 }, "slow");

	// change url
	history.pushState({}, null, `?page=${route}`);
};

// handle iframe src changing
const updateRouteInfo = () => {
	const path = document.getElementById("iframeMain").contentWindow.location
		.href;

	// handle non authenticated cases
	if (path.indexOf("noauth.html") > -1) {
		window.location = "../login.html";
		return;
	}

	// get route params
	const urlParams = new URLSearchParams(window.location.search);
	const page = urlParams.get("page");

	// proceed with title update
	let routes = getRoutes();
	$("#txtNavbarTitle").text(routes[page].title);

	// public data for iframe access
	const mainWindowData = {
		showOutputModal,
		showConfirmModal,
		showOutputToast,
		showViewModal,
		tempData,
		loadRoute,
	};

	// make modal functions available inside the iframeMain
	const iframeWindow = document.getElementById("iframeMain").contentWindow;
	iframeWindow.mainWindow = mainWindowData;

	// if location is dashboard, update tile visibility
	if (page == "dashboard") {
		iframeWindow.updateTiles();
	}

	// set permissions for forms and other components inside iframe
	if (iframeWindow.loadModule) {
		const moduleName = page.toUpperCase().trim();
		const permission = tempData.privileges[moduleName];
		iframeWindow.loadModule(permission);
	}
};

const getRoutes = () => {
	return {
		dashboard: {
			title: "Dashboard",
			path: "/pages/dashboard/dashboard.html",
		},
		employee: {
			title: "Employee View",
			path: "/pages/employee/employee.html",
		},
		user: {
			title: "User View",
			path: "/pages/user/user.html",
		},
		privilege: {
			title: "Privileges View",
			path: "/pages/privilege/privilege.html",
		},
		role: {
			title: "Role View",
			path: "/pages/role/role.html",
		},
		profile: {
			title: "Profile View",
			path: "/pages/profile/profile.html",
		},
		designation: {
			title: "Designation View",
			path: "/pages/designation/designation.html",
		},
		employee_status: {
			title: "Employee Status View",
			path: "/pages/employee_status/employee_status.html",
		},
		customer: {
			title: "Customer View",
			path: "/pages/customer/customer.html",
		},
		material: {
			title: "Material View",
			path: "/pages/material/material.html",
		},
		product: {
			title: "Product View",
			path: "/pages/product/product.html",
		},
		product_package: {
			title: "Product Package View",
			path: "/pages/product_package/product_package.html",
		},
		supplier: {
			title: "Supplier View",
			path: "/pages/supplier/supplier.html",
		},
		supplier_material: {
			title: "Supplier Material View",
			path: "/pages/supplier_material/supplier_material.html",
		},
		material_analysis: {
			title: "Material Analysis",
			path: "/pages/material_analysis/material_analysis.html",
		},
		quotation_request: {
			title: "Quotation Request View",
			path: "/pages/quotation_request/quotation_request.html",
		},
		quotation: {
			title: "Quotation View",
			path: "/pages/quotation/quotation.html",
		},
		material_inventory: {
			title: "Material Inventory View",
			path: "/pages/material_inventory/material_inventory.html",
		},
		purchase_order: {
			title: "Purchase Order View",
			path: "/pages/purchase_order/purchase_order.html",
		},
		grn: {
			title: "GRN View",
			path: "/pages/grn/grn.html",
		},
		supplier_payment: {
			title: "Supplier Payment View",
			path: "/pages/supplier_payment/supplier_payment.html",
		},
		customer_order: {
			title: "Customer Order View",
			path: "/pages/customer_order/customer_order.html",
		},
		customer_invoice: {
			title: "Customer Invoice View",
			path: "/pages/customer_invoice/customer_invoice.html",
		},
		production_order: {
			title: "Production Order View",
			path: "/pages/production_order/production_order.html",
		},
		production_order_confirm: {
			title: "Production Order Confirm View",
			path: "/pages/production_order_confirm/production_order_confirm.html",
		},
		production_inventory: {
			title: "Production Inventory View",
			path: "/pages/production_inventory/production_inventory.html",
		},
		sales_report: {
			title: "Sales Report",
			path: "/pages/sales_report/sales_report.html",
		},
		revenue_report: {
			title: "Revenue Report",
			path: "/pages/revenue_report/revenue_report.html",
		},
		demand_report: {
			title: "Demand Report",
			path: "/pages/demand_report/demand_report.html",
		},
		production_cost_report: {
			title: "Production Cost Report",
			path: "/pages/production_cost_report/production_cost_report.html",
		},
		product_package_cost_analysis: {
			title: "Product Package Cost Analysis",
			path:
				"/pages/product_package_cost_analysis/product_package_cost_analysis.html",
		},
		noauth: {
			title: "Auth Failure",
			path: "/pages/noauth.html",
		},
	};
};
