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
};

$(document).ready(function () {
	// event listener for filtering cards
	$("#txtFilterCards").on("keyup change", (e) => {
		const keyword = e.target.value.trim().toLowerCase();

		// when keyword is empty
		if (keyword.trim() == "") {
			updateTiles();
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
	});
}
