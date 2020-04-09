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
      keys.forEach(key => headings += `<th>${key}</th>`);
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
        <table class="table table-bordered data-table">
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
      keys.forEach(key => rows += `<td>${dataItem[key]}</td>`)
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
    try { $(`#${parentId}-dt-search, #${parentId}-dt-tbody`).off()} catch { }
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
  }
}