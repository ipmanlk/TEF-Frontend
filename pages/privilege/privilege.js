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
        data: { module: "PRIVILEGE" }
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
    const response = await Request.send("/api/privileges", "GET");

    // convert response data to data table format
    return getTableData(response.data);
}

const searchEntries = async (searchValue) => {
    const response = await Request.send("/api/privileges", "GET", {
        data: { keyword: searchValue }
    });

    const tableData = getTableData(response.data);

    // load data to global main table
    mainTable.reload(tableData);
}

const loadMoreEntries = async (searchValue, rowsCount) => {

    // check if all data has been loaded
    if (!tempData.loadMore) return;

    const response = await Request.send("/api/privileges", "GET", {
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
        role.privileges.forEach(p => {
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
                "Edit": `<button class="btn btn-warning btn-sm" onclick="editEntry('${role.id}')">Edit</button>`
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
    $("#btnModuleAdd").on("click", () => {
        addToModuleList($("#moduleId").val());
    });
    $("#roleId").on("change", (e) => {
        reloadModuleList(e.target.value);
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
    let privileges, modules;

    // get data from the api for each dropbox
    let response;
    response = await Request.send("/api/privileges", "GET");
    privileges = response.data;

    response = await Request.send("/api/general", "GET", { data: { table: "module" } });
    modules = response.data;

    // select input ids and relevent data
    const dropdownData = {
        roleId: privileges,
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

    // load initial privilege table
    reloadModuleList(privileges[0].id);
}

const validateForm = async (isForUpdating = false) => {
    let errors = "";
    let entry = {};

    // validate form inputs
    for (let vi of tempData.validationInfo) {
        // element id is equal to database attribute
        const elementId = vi.attribute;
        let isValid = false;
        isValid = FormUtil.validateElementValue(vi);
        // check for errors and add to entry object
        if (!isValid) {
            errors += `${vi.error}<br/>`
        } else {
            entry[elementId] = $(`#${elementId}`).val();
        }
    }

    // set id (role id)
    if (isForUpdating) {
        entry.roleId = tempData.selectedEntry.id;
    }

    // delete useless property
    delete entry.moduleId;

    // validate module permissions
    const privileges = [

    ];

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
        privileges.push({
            roleId: entry.roleId,
            moduleId: moduleId,
            permission: permission
        });
    });

    // add permissions for each module to the entry
    entry.privileges = privileges;

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

    // new entry object
    let newEntryObj = data;

    // send put reqeust to update data
    const response = await Request.send("/api/privileges", "POST", { data: newEntryObj });

    // show output modal based on response
    if (response.status) {
        mainWindow.showOutputToast("Success!", response.msg);
        reloadModule();
    } else {
        mainWindow.showOutputModal("Sorry!", response.msg);
    }
}

const editEntry = async (id) => {
    // get entry data from db and show in the form
    const response = await Request.send("/api/privileges", "GET", { data: { id: id } });
    const entry = response.data;

    const dropdowns = [
        "roleId",
    ];

    // select proper options in dropdowns
    dropdowns.forEach(elementId => {
        $(`#${elementId}`).children("option").each(function () {
            $(this).removeAttr("selected");
            const optionValue = parseInt($(this).attr("value"));
            if (optionValue == entry.id) {
                $(this).attr("selected", "selected");
            }
        });
    });

    // clear the module list in the form
    $("#moduleTable tbody").empty();

    // append each privilege to the module list
    entry.privileges.forEach(p => {
        addToModuleList(p.moduleId, p.permission);
    });

    // change tab to form
    $(".nav-tabs a[href='#tabForm']").tab("show");

    // set entry object globally to later compare
    window.tempData.selectedEntry = entry;

    if (entry.privileges.length > 0) {
        setFormButtionsVisibility("edit");
    } else {
        setFormButtionsVisibility("add");
    }
}

// update entry in the database
const updateEntry = async () => {
    const { status, data } = await validateForm(true);

    // if there are errors
    if (!status) {
        mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
        return;
    }

    const selectedEntry = tempData.selectedEntry;

    // new entry object
    let newEntryObj = data;

    // check if any of the data in entry has changed
    let dataHasChanged = false;

    selectedEntry.privileges.every((p, index) => {
        if (p.permission !== newEntryObj.privileges[index].permission) {
            dataHasChanged = true;
            return false;
        }
        return true;
    });

    // if nothing has been modifed
    if (!dataHasChanged) {
        mainWindow.showOutputModal("Sorry!.", "You haven't changed anything to update.");
        return;
    }

    // set id of the newEntry object
    newEntryObj.id = tempData.selectedEntry.id;

    // send put reqeust to update data
    const response = await Request.send("/api/privileges", "PUT", { data: newEntryObj });

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

const setFormButtionsVisibility = (action) => {
    switch (action) {
        case "edit":
            $("#btnFmAdd").hide();
            $("#btnFmUpdate").show();
            $("#btnFmReset").show();
            break;

        case "add":
            $("#btnFmAdd").show();
            $("#btnFmUpdate").hide();
            $("#btnFmReset").show();
            break;
    }
}

// reset form
const resetForm = () => {
    $("#mainForm").trigger("reset");
    $(".form-group").removeClass("has-error has-success");
    $(".form-group").children(".form-control-feedback").remove();
    $("#moduleTable tbody").empty();
}

/*-------------------------------------------------------------------------------------------------------
                                            Module Table
-------------------------------------------------------------------------------------------------------*/

const addToModuleList = (moduleId, permission = "0000") => {
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
    put = parseInt(permissions[2]) ? "checked" : "";
    del = parseInt(permissions[3]) ? "checked" : "";

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
            <buttn onClick="removeFromModuleList(this)" class="btn btn-danger btn-xs">Delete</buttn>
            </td>  
        </tr>
    `);
}

const removeFromModuleList = (button) => {
    $(button).parent().parent().remove();
}

const reloadModuleList = (roleId) => {
    editEntry(roleId);
}