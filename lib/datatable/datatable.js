class DataTable {
  constructor(parentId, data, searchCallback, loadMoreCallback, permission) {
    // parent id is the placeholder (wrapper div) for table
    this.parentId = parentId;
    // this is the function gets called when user type on search input
    this.searchCallback = searchCallback;
    // this is the function gets called when user scroll the table rows
    this.loadMoreCallback = loadMoreCallback;
    // permission used to show hide table columns (binary string)
    this.permission = permission;

    // load initial data to the table
    this.loadTable(data);

    // set event listeners for table operations (such as search and load)
    this.setEventListeners();

    this.applyPermission();
  }

  loadTable(data) {
    // id of the wrapper div around table
    const parentId = this.parentId;

    // get keys in a single object to use as table headings {key: value} 
    const keys = this.getKeys(data);

    // variables for storing headings and rows
    let headings = "", rows = "";

    // if we have at least 1 or more elements
    if (data.length > 0) {

      // generate html for table headings
      keys.forEach(key => {
        if (["Edit", "Delete", "View"].includes(key)) {
          headings += `<th class="dt-${key}-${parentId}-col">${key}</th>`
        } else {
          headings += `<th>${key}</th>`
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
      </div>`
    );
  }

  getKeys(data) {
    // get the first object in an array and extract its keys
    return (data.length > 0) ? Object.keys(data[0]) : [];
  }

  getRows(data) {
    const keys = this.getKeys(data);
    let rows = "";
    data.forEach(dataItem => {
      rows += "<tr>";
      keys.forEach(key => {
        // fix when key value is null
        dataItem[key] = (dataItem[key] == null) ? "" : dataItem[key];

        // check if value is not a button
        if (dataItem[key].indexOf("button") == -1) {
          rows += `<td><span class="dt-sm-label">${key}: </span> ${dataItem[key]}</td>`
        } else {
          // insert actions button with dt-action-col class
          let action;
          let buttonHtml = dataItem[key];
          if (buttonHtml.indexOf("Edit") > -1) action = "Edit";
          if (buttonHtml.indexOf("Delete") > -1) action = "Delete";
          if (buttonHtml.indexOf("View") > -1) action = "View";
          rows += `<td class="dt-${action}-${this.parentId}-col">${dataItem[key]}</td>`
        }
      })
      rows += "</tr>";
    });
    return rows;
  }

  reload(data) {
    // this will reload the table (empty and fill with given data)
    const rows = this.getRows(data);
    $(`#${this.parentId}-dt-tbody`).empty();
    $(`#${this.parentId}-dt-tbody`).append(rows);
  }

  append(data) {
    // this will append new data to the table
    const newRows = this.getRows(data);
    $(`#${this.parentId}-dt-tbody`).append(newRows);
    this.applyPermission();
  }

  setEventListeners() {
    const parentId = this.parentId;

    // clear existing event listeners
    try { $(`#${parentId}-dt-search, #${parentId}-dt-tbody`).off() } catch { }

    // even listneer for search box
    $(`#${parentId}-dt-search`).on("keyup", (event) => {
      this.searchCallback(event.target.value);
    });


    // event listener to detect when user scroll to the end of the table and load more
    $(`#${parentId}-dt-tbody`).scroll((e) => {
      const target = e.target;
      // const isBottom = ($(target).scrollTop() + $(target).innerHeight() + 10 >= $(target)[0].scrollHeight);
      const isBottom = ($(target).scrollTop() + $(target).innerHeight() + 20 >= $(target)[0].scrollHeight);

      if (isBottom) {
        this.loadMoreCallback($(`#${parentId}-dt-search`).val(), $(`#${parentId}-dt-tbody tr`).length);
      }
    });

    // event listener for print button
    $(`#${parentId}-dt-print`).click(() => {
      this.print();
    });
  }

  print() {
    const parentId = this.parentId;
    // print rows in the table

    // store button state (to fix issues with permission system)
    let btnEditHidden = false, btnDeleteHidden = false;

    // hide action columns if they are already hidden, then store their state for later
    $(`.dt-View-${parentId}-col`).hide();

    if (!$(`.dt-Edit-${parentId}-col`).is(":hidden")) {
      btnEditHidden = true;
      $(`.dt-Edit-${parentId}-col`).hide();
    }

    if (!$(`.dt-Delete-${parentId}-col`).is(":hidden")) {
      btnDeleteHidden = true;
      $(`.dt-Delete-${parentId}-col`).hide();
    }

    // clone html from the table
    let tableHTML = $("<div>").append($(`#${this.parentId}-dt-table`).clone()).html();

    // create new window and print the table
    const stylesheet = "http://localhost:3000/lib/bootstrap/css/bootstrap.min.css";
    const win = window.open("", "Print", "width=500,height=300");
    win.document.write(`<html><head><link rel="stylesheet" href="${stylesheet}"></head><body>${tableHTML}</body></html>`);
    setTimeout(() => {
      win.document.close();
      win.print();
      win.close();
    }, 800);

    // show previously hidden buttions based on state
    $(`.dt-View-${parentId}-col`).show();

    if (btnDeleteHidden) {
      $(`.dt-Delete-${parentId}-col`).show();
    }

    if (btnEditHidden) {
      $(`.dt-Edit-${parentId}-col`).show();
    }

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