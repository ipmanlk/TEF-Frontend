let validationInfo;

// when dom is ready
$(document).ready(async function () {
    // get regexes
    let { data } = await request("/api/regex/EMPLOYEE", "GET").catch(e => {
        console.log(e);
    });
    validationInfo = data;

    // load form and event listeners
    await loadFromSelects();
    await loadMainTable();
    registerGeneralEventListeners(validationInfo);
    registerSpecificEventListeners();
});

const loadFromSelects = async () => {
    let designations, genders, employeeStatuses, civilStatues;

    // get data from the api for each dropbox
    try {
        let response;
        response = await request("/api/employee/designation");
        designations = response.data;

        response = await request("/api/employee/gender");
        genders = response.data;

        response = await request("/api/employee/employee_status");
        employeeStatuses = response.data;

        response = await request("/api/employee/civil_status");
        civilStatues = response.data;
    } catch (e) {
        console.log(e);
    }

    // map data with dropdown ids
    const dropdownData = {
        civilStatusId: civilStatues,
        designationId: designations,
        genderId: genders,
        employeeStatusId: employeeStatuses
    }

    // populate dropboxes with data
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

const loadMainTable = async () => {
    // get employee data from server
    let employeeData = await request("/api/employees", "GET").catch(e => {
        console.log(e);
    });

    // check if server returned an error
    if (!employeeData.status) {
        window.alert(employeeData.msg);
        return;
    }

    // map data to support data table structure
    let data = employeeData.data.map(employee => {
        return {
            number: employee.number,
            fullName: employee.fullName,
            callingName: employee.callingName,
            dobirth: employee.dobirth,
            nic: employee.nic,
            address: employee.address,
            mobile: employee.mobile,
            land: employee.land,
            doassignment: employee.doassignment,
            gender: employee.gender.name,
            designation: employee.designation.name,
            civilStatus: employee.civilStatus.name,
            employeeStatus: employee.employeeStatus.name,
            edit: `<button class="btn btn-warning btn-sm" onclick="editEntry('${employee.id}')">Edit</button>`,
            delete: `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${employee.id}')">Delete</button>`
        }
    });

    // init data table
    mainTable = $("#mainTable").DataTable({
        dom: "Bfrtip",
        buttons: [
            "copy", "csv", "excel", "pdf", "print"
        ],
        data: data,
        "columns": [
            { "data": "number" },
            { "data": "nic" },
            { "data": "fullName" },
            { "data": "callingName" },
            { "data": "dobirth" },
            { "data": "mobile" },
            { "data": "land" },
            { "data": "address" },
            { "data": "designation" },
            { "data": "doassignment" },
            { "data": "employeeStatus" },
            { "data": "edit" },
            { "data": "delete" }
        ],
        responsive: true
    });
}

const registerSpecificEventListeners = () => {

    // handle image upload preview
    $("#photo").on("change", (event) => {
        if (photo.files && photo.files[0]) {
            photoPreview.src = URL.createObjectURL(event.target.files[0]);
        }
    });

    // fill date of birth from nic
    $("#nic").on("paste change keyup", (e) => {
        showDateOfBirth(e.target.value);
    });

    // for form buttons
    $("#btnFmAdd").on("click", addEntry);
}

const showDateOfBirth = (nic) => {
    let { dateOfBirth } = getNICinfo(nic);
    $("#dobirth").val(dateOfBirth);
}

const validateForm = () => {
    let errors = "";
    var formData = new FormData();

    // test each value and validate
    validationInfo.forEach(vi => {
        let elementId = vi.attribute;
        let isValid = validateElementValue(vi);

        if (!isValid) {
            errors += `${vi.error}<br/>`
        } else {
            if (elementId == "photo") {
                let file = photo.files[0];
                formData.append("photo", file);
            } else {
                formData.append(elementId, $(`#${elementId}`).val());
            }
        }
    });

    // if there aren't any errors
    if (errors == "") {
        return {
            status: true,
            data: formData
        }
    }

    // add date of birth
    formData.append("dobirth", $("#dobirth").val());

    // if there are errors
    return {
        status: false,
        data: errors
    };
}

const addEntry = async () => {
    const { status, data } = validateForm();

    // if there are errors
    if (!status) {
        mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
        return;
    }

    // get response
    const res = await request("/api/employee", "POST", data, true).catch(e => {
        console.log(e);
    });

    // show output modal based on response
    if (res.status) {
        showOutputModal("Success!", res.msg);
    } else {
        showOutputModal("Sorry!", res.msg);
    }
}

const editEntry = async (id) => {
    const res = await request("/api/employee", "GET", {
        data: {
            id: id
        }
    }).catch(e => {
        console.log(e);
    });
    const employee = res.data;

    // set input values
    Object.keys(employee).forEach(key => {
        if (key == "photo") return;
        $(`#${key}`).val(employee[key]);
    });

    // select correct option in dorpdowns
    const dropdowns = [
        "civilStatusId",
        "designationId",
        "genderId",
        "employeeStatusId"
    ];

    dropdowns.forEach(elementId => {
        $(`#${elementId}`).children("option").each(function () {
            $(this).removeAttr("selected");
            const optionValue = $(this).attr("value");
            if (optionValue == employee[elementId]) {
                $(this).attr("selected", "selected");
            }
        });
    });

    // update date of birth
    showDateOfBirth(employee.nic);

    // set profile picture preview
    $("#photoPreview").attr("src", getImageURLfromBuffer(employee.photo));

    // change tab to form
    $(".nav-tabs a[href='#form']").tab("show");
}