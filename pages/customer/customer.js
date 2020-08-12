class customerForm extends Form {
    // overwrrite register additional event listners from method
    loadAddons() {
        $(`#${this.formId} #nic`).on("paste change keyup", (e) => {
            const nic = e.target.value;
            // get details from nic
            const gender = (NIClkUtil.getGender(nic)).toString().capitalize();

            // set gender
            this.selectDropdownOptionByText("genderId", gender);
        });


        // hide company info initially
        $(`#${this.formId} .company_info`).hide();

        // when customer type select is changed, show hide components
        $(`#${this.formId} #customerTypeId`).on("change", (e) => {
            // 1 = individual
            // 2 = company
            const val = e.target.value;
            if (val == 1) {
                $(`#${this.formId} .company_info`).fadeOut();

                // reset company name value
                $(`#${this.formId} #cpname`).val("");
                $(`#${this.formId} #cpmobile`).val("");

            } else {
                $(`#${this.formId} .company_info`).fadeIn();
            }
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

        // check if this customer is already deleted and show / hide delete button
        if ($(`#${this.formId} #customerStatusId option:selected`).text() == "Deleted") {
            this.hideElement(".btnFmDelete")
        }

        this.setButtionsVisibility("edit");

        // show hide customer type components
        const customerTypeId = $(`#${this.formId} #customerTypeId`).val();
        if (customerTypeId == 1) {
            $(`#${this.formId} .company_info`).fadeOut();
        } else {
            $(`#${this.formId} .company_info`).fadeIn();
        }
    }
}

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {

    // get regexes for validation and store on window tempData
    const response = await Request.send("/api/regexes", "GET", {
        data: { module: "CUSTOMER" }
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
                "Name": entry.cname,
                "Type": entry.customerType.name,
                "Mobile": entry.cmobile,
                "E-Mail": entry.email,
                "To Be Paid": entry.toBePaid,
                "Status": entry.customerStatus.name,
                "View": `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
                "Edit": `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
                "Delete": `${entry.customerStatus.name == "Deleted" ? "" : `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`}`
            }
        });
    }

    window.mainTable = new DataTable("mainTableHolder", "/api/customers", permission, dataBuilderFunction);

    // load main form
    window.mainForm = new customerForm("mainForm", "Customer Details", permission, validationInfo,
        [
            { id: "customerStatusId", route: "/api/general?data[table]=customer_status" },
            { id: "customerTypeId", route: "/api/general?data[table]=customer_type" },
            { id: "genderId", route: "/api/general?data[table]=gender" },
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
    const response = await Request.send("/api/customers", "GET", { data: { id: id } });
    const entry = response.data;

    mainForm.loadEntry(entry);

    if (readOnly) {
        mainForm.enableReadOnly();
    } else {
        mainForm.disableReadOnly();
    }

    $("#modalMainFormTitle").text("Edit Customer");
    $("#modalMainForm").modal("show");
}

const showNewEntryModal = () => {
    mainForm.reset();

    // change customer number field text
    $("#mainForm #number").val("Customer number will be displayed after adding.");

    // set date of assignment
    $("#mainForm #doregistration").val(new Date().today());

    $("#modalMainFormTitle").text("Add New Customer");
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
    const response = await Request.send("/api/customers", "POST", { data: data });

    // show output modal based on response
    if (response.status) {
        reloadModule();
        $("#modalMainForm").modal("hide");
        mainWindow.showOutputToast("Success!", response.msg);
        mainWindow.showOutputModal("New Customer Added!", `<h5>Customer Number: ${response.data.number}</h5>`);
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
    const response = await Request.send("/api/customers", "PUT", { data: newEntryObj });

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
        const response = await Request.send("/api/customers", "DELETE", { data: { id: id } });
        if (response.status) {
            reloadModule();
            $("#modalMainForm").modal("hide");
            mainWindow.showOutputToast("Success!", response.msg);
        }
    }
}