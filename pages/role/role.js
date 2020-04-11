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
    // FormUtil.enableRealtimeValidation(tempData.validationInfo);
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
    const response = await Request.send("/api/roles", "GET");

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
    const data = [];

    responseData.forEach(role => {
        role.privilages.forEach(p => {
            const perms = p.permission.split("");
            let post, get, put, del;
            post = perms[0] ? "Yes" : "No";
            get = perms[1] ? "Yes" : "No";
            put = perms[2] ? "Yes" : "No";
            del = perms[3] ? "Yes" : "No";

            data.push({
                "Role": role.name,
                "Module": p.module.name,
                "Read": get,
                "Add": post,
                "Modify": put,
                "Remove": del,
                "View": `<button class="btn btn-success btn-sm" onclick="editEntry('${role.id}', true)">View</button>`,
                "Edit": `<button class="btn btn-warning btn-sm" onclick="editEntry('${role.id}')">Edit</button>`,
                "Delete": `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${role.id}')">Delete</button>`
            });
        });
    });

    return data;
}

/*-------------------------------------------------------------------------------------------------------
                                            Main Form
-------------------------------------------------------------------------------------------------------*/

const registerEventListeners = () => {

    // disable from submissions
    $("form").on("submit", (e) => e.preventDefault());

    // register listeners for form buttons
    $("#btnFmAdd").on("click", addEntry);
    $("#btnFmUpdate").on("click", updateEntry);
    $("#btnFmDelete").on("click", () => deleteEntry());
    $("#btnFmReset").on("click", resetForm);
    $("#btnFmPrint").on("click", () => FormUtil.print());
    $("#btnModuleAdd").on("click", () => {
        addModuleToList($("#moduleId").val());
    });
    //  register listeners for form tab click
    $(".nav-tabs a[href='#tabForm']").on("click", formTabClick);

    // catch promise rejections
    $(window).on("unhandledrejection", (event) => {
        console.error("Unhandled rejection (promise: ", event.promise, ", reason: ", event.reason, ").");
    });
}

const loadFormDropdowns = async () => {
    // define needed attributes
    let roles, modules;

    // get data from the api for each dropbox
    let response;
    response = await Request.send("/api/roles", "GET");
    roles = response.data;

    response = await Request.send("/api/general", "GET", { data: { table: "module" } });
    modules = response.data;

    // select input ids and relevent data
    const dropdownData = {
        roleId: roles,
        moduleId: modules,
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

    // validate module permissions
    const modulePermission = {

    };

    $("#moduleTable tbody tr").each((i, tr) => {
        const children = $(tr).children();
        const moduleId = $(children[0]).html();
        const post = $(children[2]).children().first().is(":checked") ? 1 : 0;
        const get = $(children[3]).children().first().is(":checked") ? 1 : 0;
        const put = $(children[4]).children().first().is(":checked") ? 1 : 0;
        const del = $(children[5]).children().first().is(":checked") ? 1 : 0;
        let permission = `${post}${get}${put}${del}`;
        if (permission == "0000") {
            errors += "Please check at least one permission for each module or remove restricted ones.";
            return false;
        }
        modulePermission[moduleId] = permission;
    });
    
    // todo: validate form inputs

    
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

/*-------------------------------------------------------------------------------------------------------
                                            Module Table
-------------------------------------------------------------------------------------------------------*/

const addModuleToList = (moduleId, permission="0000") => {
    const moduleName = $(`#moduleId option[value=${moduleId}]`).text();

    // check if module is already in the list
    if ($("#moduleTable tbody").html().indexOf(`${moduleName}`) > -1) {
        window.alert("You can't add same one twice");
        return;
    }

    // permissions and checkbox selections
    let permissions = permission.split("");
    let post, get, put, del;    
    post = parseInt(permissions[0]) ? "checked" : "";
    get = parseInt(permissions[1]) ? "checked" : "";
    put = parseInt(permissions[2])  ? "checked" : "";
    del = parseInt(permissions[3])  ? "checked" : "";

    // append module to the list
    $("#moduleTable tbody").append(`
        <tr>
            <td style="display:none">${moduleId}</td>
            <td>${moduleName}</td>
            <td><input type="checkbox" id="${moduleId}read" ${get}></td>
            <td><input type="checkbox" id="${moduleId}add" ${post}></td>
            <td><input type="checkbox" id="${moduleId}modify" ${put}></td>
            <td><input type="checkbox" id="${moduleId}remove" ${del}></td>
            <td>
            <buttn onClick="removeModuleFromList(this)" class="btn btn-danger btn-xs">Delete</buttn>
            </td>  
        </tr>
    `);
}

const removeModuleFromList = (button) => {
    $(button).parent().parent().remove();
}