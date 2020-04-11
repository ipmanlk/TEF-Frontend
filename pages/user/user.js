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
        data: { module: "USER" }
    });

    // save validation info (regexes) on global tempData
    tempData.validationInfo = response.data;

    await loadMainTable();
    await loadFormDropdowns();
    registerEventListeners();
    FormUtil.enableRealtimeValidation(tempData.validationInfo);
});

// reload main table data and from after making a change
const reloadModule = async () => {
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

const getInitialTableData = async () => {
    // get initial entries from the server
    const response = await Request.send("/api/users", "GET", {
        data: { keyword: "", skip: 0 }
    });

    // convert response data to data table format
    return getTableData(response.data);
}

const searchEntries = async (searchValue) => {
    const response = await Request.send("/api/users", "GET", {
        data: { keyword: searchValue }
    });

    const tableData = getTableData(response.data);

    // load data to global main table
    mainTable.reload(tableData);
}

const loadMoreEntries = async (searchValue, rowsCount) => {

    // check if all data has been loaded
    if (!tempData.loadMore) return;

    const response = await Request.send("/api/users", "GET", {
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
    // when form tab is clicked, reset the form 
    resetForm();

    // show / hide proper button
    setFormButtionsVisibility("add");

    // enable form inputs
    FormUtil.setReadOnly("#mainForm", false);
}

const getTableData = (responseData) => {
    // parse resposne data and return in data table frendly format
    return responseData.map(entry => {
        return {
            "Number": entry.employee.number,
            "Username": entry.username,
            "Role": entry.role.name,
            "Status": entry.userStatus.name,
            "Created by": entry.employeeCreated.number,
            "Created on": entry.docreation,
            "View": `<button class="btn btn-success btn-sm" onclick="editEntry('${entry.id}', true)">View</button>`,
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
    $("#btnFmPrint").on("click", () => FormUtil.print());

    //  register listeners for form tab click
    $(".nav-tabs a[href='#tabForm']").on("click", formTabClick);

    // catch promise rejections
    $(window).on("unhandledrejection", (event) => {
        console.error("Unhandled rejection (promise: ", event.promise, ", reason: ", event.reason, ").");
    });
}

const loadFormDropdowns = async () => {
    // define needed attributes
    let roles, userStatuses;

    // get data from the api for each dropbox
    let response;
    response = await Request.send("/api/roles", "GET");
    roles = response.data;

    response = await Request.send("/api/general", "GET", { data: {table: "user_status"} });
    userStatuses = response.data;

    // select input ids and relevent data
    const dropdownData = {
        roleId: roles,
        userStatusId: userStatuses,
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
    });
}


const validateForm = async () => {
    let errors = "";
    let entry = {};

    // Loop through each validation info item (vi) validate it's value;
    for (let vi of tempData.validationInfo) {
        // element id is equal to database attribute
        const elementId = vi.attribute;

        let isValid = false;

        isValid = FormUtil.validateElementValue(vi);

        // check for errors and add to entry object
        if (!isValid) {
            errors += `${vi.error}<br/>`
        } else {
            // sepecial cases
            if (elementId == "number") {
                entry["employee"] = {};
                entry["employee"]["number"] = $(`#${elementId}`).val();
                continue;
            }

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
    const response = await Request.send("/api/users", "POST", { data: data });

    // show output modal based on response
    if (response.status) {
        mainWindow.showOutputToast("Success!", response.msg);
        showNextNumber();
        reloadModule();
    } else {
        mainWindow.showOutputModal("Sorry!", response.msg);
    }
}

const editEntry = async (id, readOnly = false) => {
    // get entry data from db and show in the form
    const response = await Request.send("/api/users", "GET", { data: { id: id } });
    const entry = response.data;

    // set input values
    $("#number").val(entry.employee.number);
    $("#username").val(entry.username);
    $("#description").val(entry.description);

    const dropdowns = [
        "roleId",
        "userStatusId",
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

    // change tab to form
    $(".nav-tabs a[href='#tabForm']").tab("show");

    // set entry object globally to later compare
    window.tempData.selectedEntry = entry;

    if (readOnly) {
        setFormButtionsVisibility("view");
        FormUtil.setReadOnly("#mainForm", true);
    } else {
        FormUtil.setReadOnly("#mainForm", false);
        setFormButtionsVisibility("edit");
    }
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
    const response = await Request.send("/api/users", "PUT", { data: newEntryObj });

    // show output modal based on response
    if (response.status) {
        mainWindow.showOutputToast("Success!", response.msg);
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
        const response = await Request.send("/api/users", "DELETE", { data: { id: id } });
        if (response.status) {
            mainWindow.showOutputToast("Success!", response.msg);
            tempData.selectedEntry = undefined
            reloadModule();
        } else {
            mainWindow.showOutputModal("Sorry!", response.msg);
        }
    }
}

const setFormButtionsVisibility = (action) => {
    switch (action) {
        case "view":
            $("#btnFmAdd").hide();
            $("#btnFmUpdate").hide();
            $("#btnFmDelete").hide();
            $("#btnFmReset").hide();
            $("#btnFmPrint").show();
            break;

        case "edit":
            $("#btnFmAdd").hide();
            $("#btnFmUpdate").show();
            $("#btnFmDelete").show();
            $("#btnFmReset").show();
            $("#btnFmPrint").hide();
            break;

        case "add":
            $("#btnFmAdd").show();
            $("#btnFmUpdate").hide();
            $("#btnFmDelete").hide();
            $("#btnFmReset").show();
            $("#btnFmPrint").hide();
            break;
    }
}

// reset form
const resetForm = () => {
    $("#mainForm").trigger("reset");
    $(".form-group").removeClass("has-error has-success");
    $(".form-group").children(".form-control-feedback").remove();
    $("#photoPreview").attr("src", "../../img/avatar.png");
}