class employeeForm extends Form {
    // overwrrite register additional event listners from method
    loadAddons() {
        $(`#${this.formId} #photo`).on("change", (e) => {
            let photo = e.target;
            if (photo.files && photo.files[0]) {
                $(`#${this.formId} #photoPreview`).attr("src", URL.createObjectURL(photo.files[0]));
            }
        });

        $(`#${this.formId} #nic`).on("paste change keyup", (e) => {
            const nic = e.target.value;
            // get details from nic
            const dateOfBirth = NIClkUtil.getDOB(nic);
            const gender = (NIClkUtil.getGender(nic)).toString().capitalize();

            // fill form elements
            $(`#${this.formId} #dobirth`).val(dateOfBirth);

            $(`#${this.formId} #genderId`).children("option").each(function () {
                $(this).removeAttr("selected");

                // get the text of current option element
                const currentText = $(this).text();

                // check if current text is equal to given text
                if (currentText == gender) {
                    $(this).attr("selected", "selected");
                }
            });
        });
    }

    // overwrrite load entry
    loadEntry = (entry) => {
        this.reset();
        this.selectedEntry = entry;

        // load entry values to form
        Object.keys(entry).forEach(key => {
            // ignore file uploads
            if ($(`#${this.formId} #${key}`).attr("type") == "file") return;

            // ignore dropdown values
            if (this.dropdownIds.indexOf(key) !== -1) return;

            // set value in the form input
            $(`#${this.formId} #${key}`).val(entry[key]);
        });

        // select dropdown values
        this.dropdownIds.forEach(dropdownId => {
            this.selectDropdownOptionByValue(dropdownId, entry[dropdownId]);
        });

        // set profile picture preview
        const imageURL = MiscUtil.getURLfromBuffer(entry.photo);

        $(`#${this.formId} #photoPreview`).attr("src", imageURL);

        // check if this employee is already deleted and show / hide delete button
        if ($(`#${this.formId} #employeeStatusId option:selected`).text() == "Deleted") {
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
        data: { module: "EMPLOYEE" }
    });

    const validationInfo = response.data;

    // create an array from permission string
    const permission = permissionStr.split("").map((p) => parseInt(p));

    // load main tbale
    const dataBuilderFunction = (responseData) => {
        // parse resposne data and return in data table frendly format
        return responseData.map(entry => {
            return {
                "Number": entry.number,
                "Full Name": entry.fullName,
                "Calling Name": entry.callingName,
                "NIC": entry.nic,
                "Mobile": entry.mobile,
                "Designation": entry.designation.name,
                "Civil Status": entry.civilStatus.name,
                "Status": entry.employeeStatus.name,
                "View": `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
                "Edit": `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
                "Delete": `${entry.employeeStatus.name == "Deleted" ? "" : `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`}`
            }
        });
    }

    window.mainTable = new DataTable("mainTableHolder", "/api/employees", permission, dataBuilderFunction);

    // load main form
    window.mainForm = new employeeForm("mainForm", "Employee Details", permission, validationInfo,
        [
            { id: "designationId", route: "/api/designations" },
            { id: "genderId", route: "/api/general?data[table]=gender" },
            { id: "civilStatusId", route: "/api/general?data[table]=civil_status" },
            { id: "employeeStatusId", route: "/api/employee_statuses" },
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
                                            Modals
-------------------------------------------------------------------------------------------------------*/

const showEditEntryModal = async (id, readOnly = false) => {
    // get entry data from db and show in the form
    const response = await Request.send("/api/employees", "GET", { data: { id: id } });
    const entry = response.data;

    mainForm.loadEntry(entry);

    if (readOnly) {
        mainForm.enableReadOnly();
    } else {
        mainForm.disableReadOnly();
    }

    $("#modalMainFormTitle").text("Edit Employee");
    $("#modalMainForm").modal("show");
}

const showNewEntryModal = () => {
    mainForm.reset();

    // change employee number field text
    $("#mainForm #number").val("Employee number will be displayed after adding.");

    // set date of assignment
    $("#mainForm #doassignment").val(new Date().today());

    $("#modalMainFormTitle").text("Add New Employee");
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
    const response = await Request.send("/api/employees", "POST", { data: data });

    // show output modal based on response
    if (response.status) {
        reloadModule();
        $("#modalMainForm").modal("hide");
        mainWindow.showOutputToast("Success!", response.msg);
        mainWindow.showOutputModal("New Employee Added!", `<h5>Employee Number: ${response.data.number}</h5>`);
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
    const response = await Request.send("/api/employees", "PUT", { data: newEntryObj });

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
        const response = await Request.send("/api/employees", "DELETE", { data: { id: id } });
        if (response.status) {
            reloadModule();
            $("#modalMainForm").modal("hide");
            mainWindow.showOutputToast("Success!", response.msg);
        }
    }
}