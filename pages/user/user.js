// globally available temprary data
window.tempData = { selectedEntry: undefined, validationInfo: undefined };

// when dom is ready
$(document).ready(async function () {
    // get regexes
    // let { data } = await request("/api/regex/USER", "GET").catch(e => {
    //     console.log(e);
    // });
    // tempData.validationInfo = data;

    // // load form and event listeners
    // await loadFormDropdowns();
    await loadMainTable();
    // registerGeneralEventListeners(tempData.validationInfo);
    // registerSpecificEventListeners();
});

// Event listners unique to each module
const registerSpecificEventListeners = () => {
    // for form buttons
    $("#btnFmAdd").on("click", addEntry);
    $("#btnFmUpdate").on("click", updateEntry);
    $("#btnFmDelete").on("click", deleteEntry);
    $("#btnFmReset").on("click", resetForm);

    // for tabs
    $(".nav-tabs a[href='#formTab']").on("click", formTabClick);
}

// get data and fill drop downs (selects) in the form
const loadFormDropdowns = async () => {
    // let designations, genders, employeeStatuses, civilStatues;

    // // get data from the api for each dropbox
    // try {
    //     let response;
    //     response = await request("/api/employee/designation");
    //     designations = response.data;

    //     response = await request("/api/employee/gender");
    //     genders = response.data;

    //     response = await request("/api/employee/employee_status");
    //     employeeStatuses = response.data;

    //     response = await request("/api/employee/civil_status");
    //     civilStatues = response.data;
    // } catch (e) {
    //     console.log(e);
    // }

    // // map data with dropdown ids
    // const dropdownData = {
    //     civilStatusId: civilStatues,
    //     designationId: designations,
    //     genderId: genders,
    //     employeeStatusId: employeeStatuses
    // }

    // // populate dropboxes with data
    // Object.keys(dropdownData).forEach(dropdownId => {
    //     const selector = `#${dropdownId}`;
    //     $(selector).empty();

    //     dropdownData[dropdownId].forEach(entry => {
    //         $(selector).append(`
    //         <option value="${entry.id}">${entry.name}</option>
    //         `);
    //     });
    // });
}

// get entry list and populate the data table
const loadMainTable = async () => {
    // get data from server
    let entriesData = await request("/api/users", "GET").catch(e => {
        console.log(e);
    });

    // check if server returned an error
    if (!entriesData.status) {
        window.alert(entriesData.msg);
        return;
    }

    // map data to support data table structure
    let data = entriesData.data.map(entry => {
        return {
            number: entry.employee.number,
            username: entry.username,
            roleName: entry.role.name,
            userStatusName: entry.userStatus.name,
            employeeCreatedNumber: entry.employeeCreated.number,
            docreation: entry.docreation,
            edit: `<button class="btn btn-warning btn-sm" onclick="editEntry('${entry.id}')">Edit</button>`,
            delete: `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')">Delete</button>`
        }
    });

    // if data table object is already present, destroy it
    if ($.fn.DataTable.isDataTable("#mainTable")) {
        await $("#mainTable").DataTable().clear().destroy();
    }

    // init data table
    mainTable = $("#mainTable").DataTable({
        dom: "Bfrtip",
        buttons: [
            "copy", "csv", "excel", "pdf", "print"
        ],
        data: data,
        "columns": [
            { "data": "number" },
            { "data": "username" },
            { "data": "roleName" },
            { "data": "userStatusName" },
            { "data": "employeeCreatedNumber" },
            { "data": "docreation" },
            { "data": "edit" },
            { "data": "delete" }
        ],
        responsive: true
    });
}

const formTabClick = async () => {
    resetForm();

    const { data } = await request("/api/employee/next_number").catch(e => {
        console.log(e);
    });

    // set next employee number in the form
    $("#number").val(data.nextNumber);

    $("#btnFmAdd").show();
    $("#btnFmUpdate").hide();
}

// validate each input in the form
const validateForm = async () => {
    let errors = "";
    let entry = {};

    // Loop through each validation info item (vi) validate it's value;
    for (let vi of tempData.validationInfo) {
        // element id is equal to database attribute
        const elementId = vi.attribute;

        let isValid = false;

        // handle profile picture validation
        if (elementId == "photo") {
            if (photo.files[0]) {
                try {
                    entry[elementId] = await getBase64FromFile(photo.files[0]);
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
            isValid = validateElementValue(vi);
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
    const res = await request("/api/employee", "POST", { data: data }).catch(e => {
        console.log(e);
    });

    // show output modal based on response
    if (res.status) {
        mainWindow.showOutputModal("Success!", res.msg);
        reloadData();
    } else {
        mainWindow.showOutputModal("Sorry!", res.msg);
    }
}

// get entry data from db and show in the form
const editEntry = async (id) => {
    const res = await request("/api/employee", "GET", {
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
    const imageURL = getImageURLfromBuffer(entry.photo);
    $("#photoPreview").attr("src", imageURL);
    photo.files[0] = entry.photo.data;

    // change tab to form
    $(".nav-tabs a[href='#formTab']").tab("show");

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
    const res = await request("/api/employee", "PUT", { data: newEntryObj }).catch(e => {
        console.log(e);
    });

    // show output modal based on response
    if (res.status) {
        mainWindow.showOutputModal("Success!", res.msg);
        // reset selected entry
        tempData.selectedEntry = undefined;

        reloadData();
    } else {
        mainWindow.showOutputModal("Sorry!", res.msg);
    }
}

// delete entry from the database
const deleteEntry = async (id = tempData.selectedEntry.id) => {
    const confirmation = await mainWindow.showConfirmModal("Confirmation", "Do you really need to delete this entry?");

    if (confirmation) {
        const res = await request("/api/employee", "DELETE", { data: { id: id } }).catch(e => {
            console.log(e);
        });

        mainWindow.showOutputModal("Success!", "That entry has been deleted!.");
        reloadData();
    }
}

// reload main table data and from after making a change
const reloadData = () => {
    loadMainTable();
    resetForm();
}

// reset form
const resetForm = () => {
    $("#mainForm").trigger("reset");
    $(".form-group").removeClass("has-error has-success");
    $(".form-group").children(".form-control-feedback").remove();
    $("#photoPreview").attr("src", "../../img/avatar.png");
}