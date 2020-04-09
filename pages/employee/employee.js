/*-------------------------------------------------------------------------------------------------------
                                          Window Data
-------------------------------------------------------------------------------------------------------*/
window.tempData = { selectedEntry: undefined, validationInfo: undefined, loadMore: true };


/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

$(document).ready(async () => {
    // get regexes for validation and store on window tempData
    const response = await Request.send("/api/regexes", "GET", {
        data: { module: "EMPLOYEE" }
    });

    // save validation info (regexes) on global tempData
    tempData.validationInfo = response.data;

    await loadMainTable();
    await loadFormDropdowns();
    registerEventListeners();
    FormUtil.enableRealtimeValidation(tempData.validationInfo);
});

// reload main table data and from after making a change
const reloadModule = async() => {
    resetForm();
    const tableData = await getInitialTableData();
    mainTable.reload(tableData);

    // fix for additional load more requests
    setTimeout(() => tempData.loadMore = true, 500);
}

/*-------------------------------------------------------------------------------------------------------
                                            Main Table
-------------------------------------------------------------------------------------------------------*/
const loadMainTable = async () => {
    const tableData = await getInitialTableData();

    // load data table
    window.mainTable = new DataTable("mainTableHolder", tableData, searchEntries, loadMoreEntries);
}

const getInitialTableData = async() => {
    // get initial entries from the server
    const response = await Request.send("/api/employees", "GET", {
        data: { keyword: "", skip: 0 }
    });

    // convert response data to data table format
    return getTableData(response.data);
}

const searchEntries = async (searchValue) => {
    const response = await Request.send("/api/employees", "GET", {
        data: { keyword: searchValue }
    });

    const tableData = getTableData(response.data);

    // load data to global main table
    mainTable.loadTable(tableData);
}

const loadMoreEntries = async (searchValue, rowsCount) => {

    // check if all data has been loaded
    if (!tempData.loadMore) return;

    const response = await Request.send("/api/employees", "GET", {
        data: { keyword: searchValue, skip: rowsCount }
    });

    // if results came empty (all loaded)
    if (response.data.length == 0) {
        tempData.loadMore = false;
        return;
    }

    const tableData = getTableData(response.data);

    // append to global main table
    mainTable.append(tableData);
}

const formTabClick = async () => {
    // when form tab is clicked, reset the form and get next available employee number
    resetForm();
    await showNextNumber();
    // show / hide proper button
    $("#btnFmAdd").show();
    $("#btnFmUpdate").hide();
}

const showNextNumber = async () => {
    const response = await Request.send("/api/employees/next_number");

    // set next employee number in the form
    $("#number").val(response.data.nextNumber);
}

const getTableData = (responseData) => {
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
            "Employee Status": entry.employeeStatus.name,
            "View": `<button class="btn btn-success btn-sm" onclick="editEntry('${entry.id}')">View</button>`,
            "Edit": `<button class="btn btn-warning btn-sm" onclick="editEntry('${entry.id}')">Edit</button>`,
            "Delete": `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')">Delete</button>`
        }
    });
}

/*-------------------------------------------------------------------------------------------------------
                                            Main Form
-------------------------------------------------------------------------------------------------------*/

const registerEventListeners = () => {

    // disable from submissions
    $("form").on("submit", (e) => e.preventDefault());

    // show photo preview when image is selected
    $("#photo").on("change", (event) => {
        if (photo.files && photo.files[0]) {
            photoPreview.src = URL.createObjectURL(event.target.files[0]);
        }
    });

    // show date of birth when nic typed
    $("#nic").on("paste change keyup", (e) => {
        showDateOfBirth(e.target.value);
    });

    // register listeners for form buttons
    $("#btnFmAdd").on("click", addEntry);
    $("#btnFmUpdate").on("click", updateEntry);
    $("#btnFmDelete").on("click", () => deleteEntry());
    $("#btnFmReset").on("click", resetForm);

    //  register listeners for form tab click
    $(".nav-tabs a[href='#tabForm']").on("click", formTabClick);
}

const loadFormDropdowns = async () => {
    // define needed attributes
    let designations, genders, employeeStatuses, civilStatues;

    // get data from the api for each dropbox
    try {
        let response;
        response = await Request.send("/api/designations", "GET");
        designations = response.data;

        response = await Request.send("/api/genders", "GET");
        genders = response.data;

        response = await Request.send("/api/employee_statuses", "GET");
        employeeStatuses = response.data;

        response = await Request.send("/api/civil_statuses", "GET");
        civilStatues = response.data;
    } catch (e) {
        return;
    }

    // select input ids and relevent data
    const dropdownData = {
        civilStatusId: civilStatues,
        designationId: designations,
        genderId: genders,
        employeeStatusId: employeeStatuses
    }

    // populate select inputs with data
    Object.keys(dropdownData).forEach(dropdownId => {
        const selector = `#${dropdownId}`;
        $(selector).empty();

        dropdownData[dropdownId].forEach(entry => {
            $(selector).append(`
            <option value="${entry.id}">${entry.name}</option>
            `);
        });
    })
}

const showDateOfBirth = (nic) => {
    let { dateOfBirth } = getNICinfo(nic);
    $("#dobirth").val(dateOfBirth);
}

const validateForm = async () => {
    let errors = "";
    const entry = {};

    // Loop through validation info items (vi) and check it's value using regexes
    for (let vi of tempData.validationInfo) {
        // element id is equal to database attribute name
        const elementId = vi.attribute;

        // validation status of the form
        let isValid = false;

        // handle profile picture validation
        if (elementId == "photo") {
            if (photo.files[0]) {
                try {
                    entry[elementId] = await ImageUtil.getBase64FromFile(photo.files[0]);
                    isValid = true;
                } catch (error) {
                    isValid = false;
                }
            } else if (tempData.selectedEntry && tempData.selectedEntry.photo) {
                // if photo is not set, check if selected entry has a photo
                entry[elementId] = false;
                isValid = true;
            }
            continue;

        } else {
            // if it's not a profile picture, just validate using it's value
            isValid = FormUtil.validateElementValue(vi);
        }

        // check for errors and add to entry object
        if (!isValid) {
            errors += `${vi.error}<br/>`
        } else {
            entry[elementId] = $(`#${elementId}`).val();
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
    };
}

// add new entry to the database
const addEntry = async () => {
    const { status, data } = await validateForm();

    // if there are errors
    if (!status) {
        mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
        return;
    }

    // get response
    const response = await Request.send("/api/employees", "POST", { data: data }).catch(e => {
        console.log(e);
    });

    // show output modal based on response
    if (response.status) {
        mainWindow.showOutputModal("Success!", response.msg);
        showNextNumber();
        reloadModule();
    } else {
        mainWindow.showOutputModal("Sorry!", response.msg);
    }
}

// get entry data from db and show in the form
const editEntry = async (id) => {
    const res = await Request.send("/api/employees", "GET", {
        data: {
            id: id
        }
    }).catch(e => {
        console.log(e);
    });
    const entry = res.data;

    // set input values
    Object.keys(entry).forEach(key => {
        if (key == "photo") return;
        $(`#${key}`).val(entry[key]);
    });

    // select correct option in dorpdowns
    const dropdowns = [
        "civilStatusId",
        "designationId",
        "genderId",
        "employeeStatusId"
    ];

    // select proper options in dropdowns
    dropdowns.forEach(elementId => {
        $(`#${elementId}`).children("option").each(function () {
            $(this).removeAttr("selected");
            const optionValue = $(this).attr("value");
            if (optionValue == entry[elementId]) {
                $(this).attr("selected", "selected");
            }
        });
    });

    // update date of birth
    showDateOfBirth(entry.nic);

    // set profile picture preview
    const imageURL = ImageUtil.getURLfromBuffer(entry.photo);
    $("#photoPreview").attr("src", imageURL);
    photo.files[0] = entry.photo.data;

    // change tab to form
    $(".nav-tabs a[href='#tabForm']").tab("show");

    // set entry object globally to later compare
    window.tempData.selectedEntry = entry;

    // hide add button
    $("#btnFmAdd").hide();
    $("#btnFmUpdate").show();
}

// update entry in the database
const updateEntry = async () => {
    const { status, data } = await validateForm();

    // if there are errors
    if (!status) {
        mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
        return;
    }

    // new entry object
    let newEntryObj = data;

    // check if any of the data in entry has changed
    let dataHasChanged = false;

    for (let key in newEntryObj) {

        // when photo hasn't changed, continue
        if (key == "photo" && newEntryObj[key] == false) {
            continue;
        }

        // compare selected entry and edited entry values
        try {
            if (newEntryObj[key] !== tempData.selectedEntry[key].toString()) {
                dataHasChanged = true;
            }
        } catch (error) {
            console.log(key);
        }
    }

    // if nothing has been modifed
    if (!dataHasChanged) {
        mainWindow.showOutputModal("Sorry!.", "You haven't changed anything to update.");
        return;
    }

    // set id of the newEntry object
    newEntryObj.id = tempData.selectedEntry.id;

    // send put reqeust to update data
    const response = await Request.send("/api/employees", "PUT", { data: newEntryObj }).catch(e => {
        console.log(e);
    });

    // show output modal based on response
    if (response.status) {
        mainWindow.showOutputModal("Success!", response.msg);
        // reset selected entry
        tempData.selectedEntry = undefined;
        reloadModule();
    } else {
        mainWindow.showOutputModal("Sorry!", response.msg);
    }
}

// delete entry from the database
const deleteEntry = async (id = tempData.selectedEntry.id) => {
    const confirmation = await mainWindow.showConfirmModal("Confirmation", "Do you really need to delete this entry?");

    if (confirmation) {
        const response = await Request.send("/api/employees", "DELETE", { data: { id: id } });
        if (response.status) {
            mainWindow.showOutputModal("Success!", response.msg);
            tempData.selectedEntry = undefined
            reloadModule();
        } else {
            mainWindow.showOutputModal("Sorry!", response.msg);
        }
    }
}

// reset form
const resetForm = () => {
    $("#mainForm").trigger("reset");
    $(".form-group").removeClass("has-error has-success");
    $(".form-group").children(".form-control-feedback").remove();
    $("#photoPreview").attr("src", "../../img/avatar.png");
}

