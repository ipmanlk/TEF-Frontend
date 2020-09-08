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
            this.updateFormUI(val);
        });
    }

    // overwrrite load entry
    loadEntry(entry) {
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

        this.setButtionsVisibility("edit");

        // show, hide delete buttion based on status field 
        const statusFields = this.dropdownInfoArray.filter(di => di.statusField);
        if (statusFields.length == 1) {
            const dropdownId = statusFields[0].id;
            if ($(`#${this.formId} #${dropdownId} option:selected`).text() == "Deleted") {
                this.hideElement(".btnFmDelete");
            }
        }

        // show hide customer type components
        const customerTypeId = $(`#${this.formId} #customerTypeId`).val();
        this.updateFormUI(customerTypeId);
    }

    updateFormUI(customerTypeId) {
        if (customerTypeId == 1) {
            $(`#${this.formId} .company_info`).fadeOut();

            // reset company name value
            $(`#${this.formId} #companyName`).val("");
            $(`#${this.formId} #companyMobile`).val("");

            $(`#${this.formId} label[for=customerName]`).text("Customer Name: ");
            $(`#${this.formId} label[for=email]`).text("E-Mail: ");
            $(`#${this.formId} #lblEmailRequired`).hide();

            // update validation info
            this.setValidationAttributesOptional(["companyName", "companyMobile", "email"]);

        } else {
            $(`#${this.formId} .company_info`).fadeIn();
            $(`#${this.formId} label[for=customerName]`).text("Contact Person Name: ");
            $(`#${this.formId} label[for=email]`).text("Company E-Mail: ");
            $(`#${this.formId} #lblEmailRequired`).show();

            // update validation info
            this.setValidationAttributesRequired(["companyName", "companyMobile", "email"]);
        }
    }


    // update form input event listeners
    updateFormInputEventListeners() {
        this.validationInfoObject.forEach(vi => {
            // remove existing listeners
            $(`#${this.formId} #${vi.attribute}`).off();
            // add new listener
            $(`#${this.formId} #${vi.attribute}`).on("keyup change", () => {
                this.validateElementValue(vi);
            });
        });

        // when supplier type select is changed, show hide components
        $(`#${this.formId} #customerTypeId`).on("change", (e) => {
            // 1 = individual
            // 2 = company
            const val = e.target.value;
            this.updateFormUI(val);
        });
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
                "Name": entry.customerName,
                "Type": entry.customerType.name,
                "Mobile": entry.customerMobile,
                "To Be Paid": entry.toBePaid,
                "Status": entry.customerStatus.name,
                "View": `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
                "Edit": `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
                "Delete": `${entry.customerStatus.name == "Deleted" ? "" : `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`}`
            }
        });
    }

    window.mainTable = new DataTable("mainTableHolder", "/api/customers", permission, dataBuilderFunction, "Customer List");

    // load main form
    window.mainForm = new customerForm("mainForm", "Customer Details", permission, validationInfo,
        [
            { id: "customerStatusId", route: "/api/general?data[table]=customer_status", statusField: true },
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

    // update ui initially to an individual
    mainForm.updateFormUI(1);

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

    // set created employee number
    const employeeNumber = mainWindow.tempData.profile.employee.number;
    const employeeFullName = mainWindow.tempData.profile.employee.fullName;
    $("#mainForm #createdEmployee").val(`${employeeNumber} (${employeeFullName})`);

    // set date of assignment
    $("#mainForm #addedDate").val(new Date().today());

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