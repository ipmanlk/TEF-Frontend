class employeeForm extends Form {
    // overwrrite validate from method
    validateForm = async () => {
        let errors = "";
        const entry = {};

        // Loop through validation info items (vi) and check it's value using regexes
        for (let vi of this.validationInfoObject) {
            // element id is equal to database attribute name
            const elementId = vi.attribute;

            // validation status of the form
            let isValid = false;

            // handle profile picture validation
            if (elementId == "photo") {
                if ($(`#${this.formId} #photo`).prop('files')[0]) {
                    try {
                        console.log("when photo is selected");
                        entry[elementId] = await ImageUtil.getBase64FromFile($(`#${this.formId} #photo`).prop('files')[0]);
                        isValid = true;
                        this.validateElementValue(vi);
                    } catch (error) {
                        isValid = false;
                    }
                    continue;
                } else if (this.selectedEntry !== undefined && this.selectedEntry.photo) {
                    // if photo is not set, check if selected entry has a photo
                    entry[elementId] = false;
                    isValid = true;
                } else {
                    this.validateElementValue(vi);
                }
            } else {
                // if it's not a profile picture, just validate using it's value
                isValid = this.validateElementValue(vi);
            }

            // check for errors and add to entry object
            if (!isValid) {
                errors += `${vi.error}<br/>`
            } else {
                entry[elementId] = $(`#${this.formId} #${elementId}`).val();
            }
        }

        // if there aren't any errors
        if (errors == "") {
            return {
                status: true,
                data: entry
            }
        }

        // if there are errors
        return {
            status: false,
            data: errors
        }
    }

    // overwrrite register additional event listners from method
    registerAdditionalEventListeners() {
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

            $(`#${this.formId} #${key}`).val(entry[key]);
        });

        // select dropdown values
        this.dropdownIds.forEach(dropdownId => {
            $(`#${this.formId} #${dropdownId}`).children("option").each((i, option) => {
                $(option).removeAttr("selected");
                // get the value of current option element
                const currentValue = $(option).attr("value");
                const optionValue = entry[dropdownId];

                // check if current value is equal to given value
                if (currentValue == optionValue) {
                    $(option).attr("selected", "selected");
                }
            });
        });

        // set profile picture preview
        const imageURL = ImageUtil.getURLfromBuffer(entry.photo);

        console.log(imageURL);
        $(`#${this.formId} #photoPreview`).attr("src", imageURL);

        // check if this employee is already deleted and show / hide delete button
        if ($(`#${this.formId} #employeeStatusId option:selected`).text() == "Deleted") {
            this.hideButton(".btnFmDelete")
        }

        this.setButtionsVisibility("edit");
    }

    hasDataChanged = async () => {
        const { status, data } = await this.validateForm();

        // if there are errors
        if (!status) {
            throw `Validate form returned errors! ${data}`;
        }

        // new entry object
        let newEntryObj = data;
        const selectedEntry = this.selectedEntry;

        // check if any of the data in entry has changed
        let dataHasChanged = false;

        for (let key in newEntryObj) {

            // when photo hasn't changed, continue
            if (key == "photo" && newEntryObj[key] == false) {
                continue;
            }

            // compare selected entry and edited entry values
            try {
                selectedEntry[key] = (selectedEntry[key] == null) ? "" : selectedEntry[key];
                if (newEntryObj[key] !== selectedEntry[key].toString()) {
                    dataHasChanged = true;
                }
            } catch (error) {
                console.log(key);
            }
        }

        return dataHasChanged;
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

    registerEventListeners();

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
    window.mainForm = new employeeForm("mainForm", "Employee Details", permission, validationInfo, {
        addEntry: addEntry,
        deleteEntry: deleteEntry,
        updateEntry: updateEntry
    });

    // load form dropdowns
    mainForm.loadDropdowns([
        { id: "designationId", route: "/api/designations" },
        { id: "genderId", route: "/api/general?data[table]=gender" },
        { id: "civilStatusId", route: "/api/general?data[table]=civil_status" },
        { id: "employeeStatusId", route: "/api/employee_statuses" },
    ]);
}

// reload main table data and from after making a change
const reloadModule = () => {
    mainForm.reset();
    mainTable.reload();
}


/*-------------------------------------------------------------------------------------------------------
                                            Main Form
-------------------------------------------------------------------------------------------------------*/

const registerEventListeners = () => {
    // event listeners for top action buttons
    $("#btnTopAddEntry").on("click", () => {
        showNewEntryModal();
    });

    // catch promise rejections
    $(window).on("unhandledrejection", (event) => {
        console.error("Unhandled rejection (promise: ", event.promise, ", reason: ", event.reason, ").");
    });
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

    // enable form inputs
    mainForm.disableReadOnly();

    // set date of assignment
    $("#doassignment").val(new Date().today());

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
        mainWindow.showOutputToast("Success!", response.msg);
        mainWindow.showOutputModal("New Employee Added!", `<h5>Employee Number: ${response.data.number}</h5>`);
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
    const response = await Request.send("/api/employees", "PUT", { data: newEntryObj });

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
        const response = await Request.send("/api/employees", "DELETE", { data: { id: id } });
        if (response.status) {
            mainWindow.showOutputToast("Success!", response.msg);
            reloadModule();
        }
    }
}