class DataTable {
    constructor(parentId, data, searchCallback) {
        this.parentId = parentId;
        this.searchCallback = searchCallback;
        this.loadTable(data);
    }

    loadTable(data) {
        const parentId = this.parentId;
        // keys
        const keys = (data.length > 0) ? Object.keys(data[0]) : [];

        // headings and rows
        let headings = "", rows = "";

        if (data.length > 0) {
            keys.forEach(key => headings += `<th>${key}</th>`);

            data.forEach(dataItem => {
                rows += "<tr>";
                keys.forEach(key => rows += `<td>${dataItem[key]}</td>`)
                rows += "</tr>";
            });
        }

        if (window.mainTable) {
            $(`#${parentId} > div > table > tbody`).empty();
            $(`#${parentId} > div > table > tbody`).append(rows);
            return;
        }

        // clear the parent
        $(`#${parentId}`).empty();

        // apend the table
        $(`#${parentId}`).append(`
              <div style="padding-left:20px; padding-right:20px;">
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
                <tbody>
                    ${rows}   
                </tbody>
              </table>
            </div>`
        );

        // event listner        
        $(`#${parentId}-dt-search`).on("keyup", (event) => {
            this.searchCallback(event.target.value);
        });
    }
}