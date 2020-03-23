let validationInfo;

// when dom is ready
$(document).ready(async function () {
    validationInfo = await getValidationInfo("EMPLOYEE");
    await loadEmployeeTable();
    registerGeneralEventListeners(validationInfo);
    registerSpecificEventListeners();
});

const loadEmployeeTable = async () => {
    // get employee data from server
    let employeeData;

    try {
        employeeData = await request("http://localhost:3000/api/employees", "GET");
    } catch (e) {
        return;
    }

    // check if server returned an error
    if (!employeeData.status) {
        window.alert(employeeData.msg);
        return;
    }

    // map data to support data table structure
    let data = employeeData.data.map(employee => {
        return {
            id: employee.id,
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
            edit: `<button class="btn btn-warning btn-sm">Edit</button>`,
            delete: `<button class="btn btn-danger btn-sm">Delete</button>`
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
            { "data": "id" },
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
    $("#nic").on("change keyup", (e) => {
        let { dateOfBirth } = getNICinfo(e.target.value);
        $("#dobirth").val(dateOfBirth);
    });

    // for form buttons
    $("#btnFmAdd").on("click", addEmployee);
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

const addEmployee = async() => {
    const { status, data } = validateForm();

    // if there are errors
    if (!status) {
        mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
        return;
    }

    // get response
    const res = await request("http://localhost:3000/api/employee", "POST", data, true).catch(e => {
        console.log(e);
    });

    // show output modal based on response
    if (res.status) {
        showOutputModal("Success!", res.msg);
    } else {
        showOutputModal("Sorry!", res.msg);
    }
}

