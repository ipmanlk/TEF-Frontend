class UserForm extends Form {
    // overwrrite register additional event listners from method
    loadAddons() {

        // load muti select dropdowns
        $(`#${this.formId} #roleIds`).multiSelect({
            selectableHeader: "All Roles",
            selectionHeader: "Selected Roles",
        });

        Request.send("/api/roles", "GET").then(response => {
            let roles = response.data;
            // populate muti selects
            roles.forEach((role) => {
                $(`#${this.formId} #roleIds`).multiSelect('addOption', { value: role.id, text: role.name });
            });
        }).catch(e => {
            console.log(e);
        });
    }

    // overwrrite load entry
    loadEntry = (entry) => {
        this.reset();
        this.selectedEntry = entry;

        // load entry values to form
        Object.keys(entry).forEach(key => {
            // ignore dropdown values
            if (this.dropdownIds.indexOf(key) !== -1) return;

            // set value in the form input
            $(`#${this.formId} #${key}`).val(entry[key]);
        });

        // select dropdown values
        this.dropdownIds.forEach(dropdownId => {
            this.selectDropdownOptionByValue(dropdownId, entry[dropdownId]);
        });

        // update muti select roles
        $(`#${this.formId} #roleIds`).multiSelect("deselect_all");
        entry.userRoles.forEach(ur => {
            $(`#${this.formId} #roleIds`).multiSelect("select", ur.roleId.toString());
        });

        // check if this user is already deleted and show / hide delete button
        if ($(`#${this.formId} #userStatusId option:selected`).text() == "Deleted") {
            this.hideElement(".btnFmDelete")
        }

        this.setButtionsVisibility("edit");
    }
}

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/


async function loadModule(permissionStr) {
    // get regexes for validation and store on window tempData
    const response = await Request.send("/api/regexes", "GET", {
        data: { module: "USER" }
    });

    const validationInfo = response.data;

    // create an array from permission string
    const permission = permissionStr.split("").map((p) => parseInt(p));


    // load main table
    const dataBuilderFunction = (responseData) => {
        // parse resposne data and return in data table frendly format
        return responseData.map(entry => {
            let roles = "";
            entry.userRoles.forEach((ur, i) => {
                roles += (i !== entry.userRoles.length - 1) ? ur.role.name + "," : ur.role.name;
            });

            return {
                "Number": entry.employee.number,
                "Username": entry.username,
                "Roles": roles,
                "Status": entry.userStatus.name,
                "Created by": entry.employeeCreated.number,
                "Created on": entry.docreation,
                "Edit": `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
                "Delete": `${entry.userStatus.name == "Deleted" ? "" : `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`}`
            }
        });
    }

    window.mainTable = new DataTable("mainTableHolder", "/api/users", permission, dataBuilderFunction);

    // load main from
    window.mainForm = new UserForm("mainForm", "User Details", permission, validationInfo,
        [
            { id: "userStatusId", route: "/api/general?data[table]=user_status" }
        ],
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
                                            Main Form
-------------------------------------------------------------------------------------------------------*/

const showNewEntryModal = () => {
    mainForm.reset();
    $("#modalMainFormTitle").text("Add New User");
    $("#modalMainForm").modal("show");
}

const showEditEntryModal = async (id, readOnly = false) => {
    // get entry data from db and show in the form
    const response = await Request.send("/api/users", "GET", { data: { id: id } });
    const entry = response.data;

    mainForm.loadEntry(entry);

    if (readOnly) {
        mainForm.enableReadOnly();
    } else {
        mainForm.disableReadOnly();
    }

    $("#modalMainFormTitle").text("Edit User");
    $("#modalMainForm").modal("show");
}

// add new entry to the database
const addEntry = async () => {
    const { status, data } = await mainForm.validateForm();

    // if there are errors
    if (!status) {
        mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
        return;
    }

    // get response
    const response = await Request.send("/api/users", "POST", { data: data });

    // show output modal based on response
    if (response.status) {
        reloadModule();
        $("#modalMainForm").modal("hide");
        mainWindow.showOutputToast("Success!", response.msg);
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
    const response = await Request.send("/api/users", "PUT", { data: newEntryObj });

    // show output modal based on response
    if (response.status) {
        reloadModule();
        $("#modalMainForm").modal("hide");
        mainWindow.showOutputToast("Success!", response.msg);
    }
}

// delete entry from the database
const deleteEntry = async (id = mainForm.selectedEntry.id) => {
    const confirmation = await mainWindow.showConfirmModal("Confirmation", "Do you really need to delete this entry?");

    if (confirmation) {
        const response = await Request.send("/api/users", "DELETE", { data: { id: id } });
        if (response.status) {
            reloadModule();
            $("#modalMainForm").modal("hide");
            mainWindow.showOutputToast("Success!", response.msg);
        }
    }
}