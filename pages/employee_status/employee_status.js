/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
    // get regexes for validation and store on window tempData
    const response = await Request.send("/api/regexes", "GET", {
        data: { module: "EMPLOYEE_STATUS" }
    });

    const validationInfo = response.data;

    // create an array from permission string
    const permission = permissionStr.split("").map((p) => parseInt(p));


    // load main table
    const dataBuilderFunction = (responseData) => {
        // parse resposne data and return in data table frendly format
        return responseData.map(entry => {
            return {
                "Name": entry.name,
                "Edit": `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
                "Delete": `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-trash" aria-hidden="true"></i> Delete</button>`
            }
        });
    }

    window.mainTable = new DataTable("mainTableHolder", "/api/employee_statuses", permission, dataBuilderFunction);

    // load main from
    window.mainForm = new Form("mainForm", "Employee Details", permission, validationInfo,
        [],
        {
            addEntry: addEntry,
            deleteEntry: deleteEntry,
            updateEntry: updateEntry
        }
    );

    // event listeners for top action buttons
    $("#btnTopAddEntry").on("click", () => {
        showNewEntryModal();
    });

    // catch promise rejections
    $(window).on("unhandledrejection", (event) => {
        console.error("Unhandled rejection (promise: ", event.promise, ", reason: ", event.reason, ").");
    });
}

// reload main table data and from after making a change
const reloadModule = () => {
    mainForm.reset();
    mainTable.reload();
}

/*-------------------------------------------------------------------------------------------------------
                                            Modals
-------------------------------------------------------------------------------------------------------*/

const showNewEntryModal = () => {
    mainForm.reset();
    $("#modalMainFormTitle").text("Add New Status");
    $("#modalMainForm").modal("show");
}

const showEditEntryModal = async (id, readOnly = false) => {
    // get entry data from db and show in the form
    const response = await Request.send("/api/employee_statuses", "GET", { data: { id: id } });
    const entry = response.data;

    mainForm.loadEntry(entry);

    if (readOnly) {
        mainForm.enableReadOnly();
    } else {
        mainForm.disableReadOnly();
    }

    $("#modalMainFormTitle").text("Edit Status");
    $("#modalMainForm").modal("show");
}

/*-------------------------------------------------------------------------------------------------------
                                            Operations
-------------------------------------------------------------------------------------------------------*/
// add new entry to the database
const addEntry = async () => {
    const { status, data } = await mainForm.validateForm();

    // if there are errors
    if (!status) {
        mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
        return;
    }

    // get response
    const response = await Request.send("/api/employee_statuses", "POST", { data: data });

    // show output modal based on response
    if (response.status) {
        mainWindow.showOutputToast("Success!", response.msg);
        reloadModule();
        $("#modalMainForm").modal("hide");
    }
}

// update entry in the database
const updateEntry = async () => {
    const { status, data } = await mainForm.validateForm();

    // if there are errors
    if (!status) {
        mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
        return;
    }

    const newEntryObj = data;
    const dataHasChanged = await mainForm.hasDataChanged();

    // if nothing has been modifed
    if (!dataHasChanged) {
        mainWindow.showOutputModal("Sorry!.", "You haven't changed anything to update.");
        return;
    }

    // set id of the newEntry object
    newEntryObj.id = mainForm.selectedEntry.id;

    // send put reqeust to update data
    const response = await Request.send("/api/employee_statuses", "PUT", { data: newEntryObj });

    // show output modal based on response
    if (response.status) {
        mainWindow.showOutputToast("Success!", response.msg);
        reloadModule();
        $("#modalMainForm").modal("hide");
    }
}

// delete entry from the database
const deleteEntry = async (id = mainForm.selectedEntry.id) => {
    const confirmation = await mainWindow.showConfirmModal("Confirmation", "Do you really need to delete this entry?");

    if (confirmation) {
        const response = await Request.send("/api/employee_statuses", "DELETE", { data: { id: id } });
        if (response.status) {
            mainWindow.showOutputToast("Success!", response.msg);
            reloadModule();
        }
    }
}