class DataTable {
  constructor(parentId, data, searchCallback, loadMoreCallback) {
    this.parentId = parentId;
    this.searchCallback = searchCallback;
    this.loadMoreCallback = loadMoreCallback;
    this.loadTable(data);
    this.setEventListeners();
  }

  loadTable(data) {
    const parentId = this.parentId;
    // keys
    const keys = this.getKeys(data);

    // headings and rows
    let headings = "", rows = "";

    if (data.length > 0) {
      keys.forEach(key => {
        if (["Edit", "Delete", "View"].includes(key)) {
          headings += `<th class="dt-${key}-${parentId}-col">${key}</th>`
        } else {
          headings += `<th>${key}</th>`
        }
      });
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
          rows += `<td>${dataItem[key]}</td>`
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
    const rows = this.getRows(data);
    $(`#${this.parentId}-dt-tbody`).empty();
    $(`#${this.parentId}-dt-tbody`).append(rows);
  }

  append(data) {
    const newRows = this.getRows(data);
    $(`#${this.parentId}-dt-tbody`).append(newRows);
  }

  setEventListeners() {
    const parentId = this.parentId;
    try { $(`#${parentId}-dt-search, #${parentId}-dt-tbody`).off() } catch { }
    $(`#${parentId}-dt-search`).on("keyup", (event) => {
      this.searchCallback(event.target.value);
    });

    $(`#${parentId}-dt-tbody`).scroll((e) => {
      const target = e.target;
      // const isBottom = ($(target).scrollTop() + $(target).innerHeight() + 10 >= $(target)[0].scrollHeight);
      const isBottom = ($(target).scrollTop() + $(target).innerHeight() >= $(target)[0].scrollHeight);
      if (isBottom) {
        this.loadMoreCallback($(`#${parentId}-dt-search`).val(), $(`#${parentId}-dt-tbody tr`).length);
      }
    });

    $(`#${parentId}-dt-print`).click(() => {
      this.print();
    });
  }

  print() {
    $(`.${this.parentId}-dt-action-col`).hide();
    const tableHTML = $("<div>").append($(`#${this.parentId}-dt-table`).clone()).html();
    const stylesheet = "http://localhost:3000/lib/bootstrap/css/bootstrap.min.css";
    const win = window.open("", "Print", "width=500,height=300");
    win.document.write(`<html><head><link rel="stylesheet" href="${stylesheet}"></head><body>${tableHTML}</body></html>`);
    setTimeout(() => {
      win.document.close();
      win.print();
      win.close();
    }, 800);
    $(`.${this.parentId}-dt-action-col`).show();
    return true;
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