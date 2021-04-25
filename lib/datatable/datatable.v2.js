class DataTable {
	constructor(
		parentId,
		apiRoute,
		permission,
		dataBuilderFunction,
		tableTitle = "",
		optionalCallback = null
	) {
		// title for table (mainly for printing)
		this.tableTitle = tableTitle;

		// route for sending api reqeusts
		this.apiRoute = apiRoute;

		// function used to buld datatable freindly object from response data
		this.dataBuilderFunction = dataBuilderFunction;

		// parent id is the placeholder (wrapper div) for table
		this.parentId = parentId;

		// permission used to show hide table columns (binary string)
		this.permission = permission;

		// this is to prevent from sending load more requests when there are no rows left to get
		this.loadMore = true;

		// optional callback for additional functions
		this.optionalCallback = optionalCallback;

		Request.send(apiRoute, "GET").then((res) => {
			// load initial data to the table
			this.loadInitialTable(res.data);

			// set event listeners for table operations (such as search and load)
			this.setEventListeners();
			this.applyPermission();

			if (this.optionalCallback != null) {
				this.optionalCallback();
			}
		});
	}

	loadInitialTable(responseData) {
		// data table friendly format
		const data = this.dataBuilderFunction(responseData);

		// id of the wrapper div around table
		const parentId = this.parentId;

		// get keys in a single object to use as table headings {key: value}
		const keys = this.getKeys(data);

		// variables for storing headings and rows
		let headings = "",
			rows = "";

		// if we have at least 1 or more elements
		if (data.length > 0) {
			// generate html for table headings
			keys.forEach((key) => {
				if (["Edit", "Delete", "View"].includes(key)) {
					headings += `<th class="dt-${key}-${parentId}-col">${key}</th>`;
				} else {
					headings += `<th>${key}</th>`;
				}
			});

			// generate html table rows
			rows = this.getRows(data);
		}

		// clear the parent
		$(`#${parentId}`).empty();

		// apend the table
		$(`#${parentId}`).append(`
      <div id="${parentId}-dt-wrapper" style="padding-left:20px; padding-right:20px;">
        <div class="row" style="margin-bottom: 10px;">
            <div class="col-xs-8">
              <button id="${parentId}-dt-print" class="btn btn-default">
              <i class="glyphicon glyphicon-print" aria-hidden="true"></i>
                Print
              </button>
            </div>
            
            <div class="col-xs-4">
                <input type="text" id="${parentId}-dt-search" class="form-control" placeholder="Search..">
            </div>
        </div>
        <table id="${parentId}-dt-table" class="table table-bordered data-table">
          <thead>
            <tr>
              ${headings}
            </tr>
          </thead>
          <tbody id="${parentId}-dt-tbody">
              ${rows}
          </tbody>
        </table>
				<center>
					<i>Scroll to load more....</i>
				</center>
      </div>`);
	}

	searchCallback(searchValue) {
		// enable load more
		this.loadMore = true;

		Request.send(this.apiRoute, "GET", {
			data: { keyword: searchValue },
		}).then((res) => {
			this.setData(res.data);
			this.applyPermission();
		});
	}

	loadMoreCallback(searchValue, rowsCount) {
		// when loadmore is disabled
		if (!this.loadMore) return;

		// to avoid multiple calls
		this.loadMore = false;

		Request.send(this.apiRoute, "GET", {
			data: { keyword: searchValue, skip: rowsCount },
		}).then((res) => {
			// check if there aren't any data
			if (res.data.length == 0) {
				this.loadMore = false;
				return;
			} else {
				this.loadMore = true;
			}

			mainTable.append(res.data);

			// add event listeners for new rows
			this.setRowListeners();

			this.applyPermission();

			if (this.optionalCallback != null) {
				this.optionalCallback();
			}
		});
	}

	getKeys(data) {
		// get the first object in an array and extract its keys
		return data.length > 0 ? Object.keys(data[0]) : [];
	}

	getRows(data) {
		const keys = this.getKeys(data);
		let rows = "";

		data.forEach((dataItem) => {
			let rowContent = "";

			keys.forEach((key) => {
				// fix when key value is null
				dataItem[key] = dataItem[key] == null ? "" : dataItem[key];
				// check if value is not a button
				if (dataItem[key].toString().indexOf("button") == -1) {
					rowContent += `<td><span class="dt-sm-label">${key}: </span> ${dataItem[key]}</td>`;
				} else {
					// insert actions button with dt-action-col class
					let action;
					let buttonHtml = dataItem[key];
					if (buttonHtml.indexOf("Edit") > -1) action = "Edit";
					if (buttonHtml.indexOf("Delete") > -1) action = "Delete";
					if (buttonHtml.indexOf("View") > -1) action = "View";
					rowContent += `<td class="dt-${action}-${this.parentId}-col">${dataItem[key]}</td>`;
				}
			});

			// maked deleted rows red
			if (rowContent.indexOf("Deleted") != -1) {
				rows += `<tr style="color:red">${rowContent}</tr>`;
			} else {
				rows += `<tr>${rowContent}</tr>`;
			}
		});
		return rows;
	}

	setData(responseData) {
		const rows = this.getRows(this.dataBuilderFunction(responseData));
		$(`#${this.parentId}-dt-tbody`).empty();
		$(`#${this.parentId}-dt-tbody`).append(rows);
		this.setRowListeners();
	}

	reload() {
		// enable load more
		this.loadMore = true;

		Request.send(this.apiRoute, "GET").then((res) => {
			// this will reload the table (empty and fill with given data)
			const rows = this.getRows(this.dataBuilderFunction(res.data));
			$(`#${this.parentId}-dt-tbody`).empty();
			$(`#${this.parentId}-dt-tbody`).append(rows);

			this.applyPermission();

			if (this.optionalCallback != null) {
				this.optionalCallback();
			}
		});
	}

	append(responseData) {
		// this will append new data to the table
		const newRows = this.getRows(this.dataBuilderFunction(responseData));
		$(`#${this.parentId}-dt-tbody`).append(newRows);
	}

	setEventListeners() {
		const parentId = this.parentId;

		// clear existing event listeners
		try {
			$(`#${parentId}-dt-search, #${parentId}-dt-tbody`).off();
		} catch {}

		// even listneer for search box
		$(`#${parentId}-dt-search`).on("keyup", (event) => {
			this.searchCallback(event.target.value);
		});

		// event listener to detect when user scroll to the end of the table and load more
		$(`#${parentId}-dt-tbody`).scroll((e) => {
			const target = e.target;
			// const isBottom = ($(target).scrollTop() + $(target).innerHeight() + 10 >= $(target)[0].scrollHeight);
			const isBottom =
				$(target).scrollTop() + $(target).innerHeight() + 20 >=
				$(target)[0].scrollHeight;

			if (isBottom) {
				this.loadMoreCallback(
					$(`#${parentId}-dt-search`).val(),
					$(`#${parentId}-dt-tbody tr`).length
				);
			}
		});

		// event listener for print button
		$(`#${parentId}-dt-print`).click(() => {
			this.print();
		});

		this.setRowListeners();
	}

	setRowListeners() {
		// clear event listeners
		$(`#${this.parentId}-dt-tbody tr`).off("hover");

		// hover highlight
		$(`#${this.parentId}-dt-tbody tr`).hover(
			function () {
				$(this).css("background-color", "#e0e0eb");
			},
			function () {
				$(this).css("background-color", "");
			}
		);
	}

	print() {
		const parentId = this.parentId;

		// clone html from the table
		let tableHTML = $("<div>")
			.append($(`#${this.parentId}-dt-table`).clone())
			.html();

		// create new window and print the table
		const stylesheet =
			"http://localhost:3000/lib/bootstrap/css/bootstrap.min.css";
		const win = window.open("", "Print", "width=500,height=300");
		win.document.write(
			`<html><head><link rel="stylesheet" href="${stylesheet}"></head><body><h2>${this.tableTitle}</h2><hr>${tableHTML}</body></html>`
		);
		setTimeout(() => {
			// element selectors to hide in the print view
			const classNames = [
				".dt-sm-label",
				`.dt-Delete-${parentId}-col`,
				`.dt-Edit-${parentId}-col`,
				`.dt-View-${parentId}-col`,
			];

			// delete nodes with above selectors from print document
			classNames.forEach((className) => {
				win.document
					.querySelectorAll(className)
					.forEach((e) => e.parentNode.removeChild(e));
			});
			win.print();
			win.document.close();
			win.close();
		}, 100);

		return true;
	}

	// apply permission to table columns
	applyPermission() {
		if (this.permission[2] == 0) {
			this.showEditColumn(false);
		}
		if (this.permission[3] == 0) {
			this.showDeleteColumn(false);
		}
	}

	showEditColumn(isVisible) {
		const parentId = this.parentId;
		if (isVisible) {
			$(`.dt-Edit-${parentId}-col`).show();
		} else {
			$(`.dt-Edit-${parentId}-col`).hide();
		}
	}

	showDeleteColumn(isVisible) {
		const parentId = this.parentId;
		if (isVisible) {
			$(`.dt-Delete-${parentId}-col`).show();
		} else {
			$(`.dt-Delete-${parentId}-col`).hide();
		}
	}
}
