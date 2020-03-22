// validation info for each form element
const validationInfo = {
    "txtEmpNumber": {
        "regex": /^[\d]{4}$/,
        "mapping": "number",
        "error": "Please provide a valid employee number!."
    },
    "txtFullName": {
        "regex": /^[\w\s]{5,150}$/,
        "mapping": "fullname",
        "error": "Please provide a valid full name!."
    },
    "txtCallingName": {
        "regex": /^[\w\s]{2,45}$/,
        "mapping": "callingname",
        "error": "Please provide a valid calling name!."
    },
    "txtNIC": {
        "regex": /^([\d]{9}(\V|\X))|([\d]{12})$/,
        "mapping": "nic",
        "error": "Please provide a valid NIC!."
    },
    "filePhoto": {
        "regex": /^.+(jpg|png|gif)$/,
        "mapping": "photo",
        "error": "Please select a valid profile picture!."
    },
    "txtAddress": {
        "regex": /^[\w\s\d\,\\\.\n\/]{10,200}$/,
        "mapping": "address",
        "error": "Please provide a valid address!."
    },
    "txtMobile": {
        "regex": /^[\d]{10}$/,
        "mapping": "mobile",
        "error": "Please provide a valid mobile number!."
    },
    "txtLand": {
        "regex": /^[\d]{10}$/,
        "mapping": "land",
        "error": "Please provide a valid landphone number!.",
        "optional": true
    },
    "txtAissgnmentDate": {
        "regex": /^(\d{4})-(\d{2})-(\d{2})$/,
        "mapping": "doassignment",
        "error": "Please select a valid date of assignment!."
    },
    "txtDescription": {
        "regex": /^[\w\s\d\,\\\.\n\/]{10,100}$/,
        "mapping": "description",
        "error": "Please provide a valid description!.",
        "optional": true
    },
    "cmbGender": {
        "regex": /^[\d]+$/,
        "mapping": "genderId",
        "error": "Please select a valid gender!."
    },
    "cmbCivilStatus": {
        "regex": /^\d+$/,
        "mapping": "civilstatusId",
        "error": "Please select a valid civil status!."
    },
    "cmbDesignation": {
        "regex": /\d+$/,
        "mapping": "designationId",
        "error": "Please select a valid designation!."
    },
    "cmbEmployeeStatus": {
        "regex": /^\d+$/,
        "mapping": "employeestatusId",
        "error": "Please select a valid employee status!."
    }
}

// when dom is ready
$(document).ready(async function () {
    await loadEmployeeTable();
    registerEventListeners();
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
    $("#mainTable").DataTable({
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

const registerEventListeners = () => {
    // realtime validation
    Object.keys(validationInfo).forEach(elementId => {
        $(`#${elementId}`).on("keyup change", () => {
            validateElementValue(elementId);
        });
    });

    // handle image upload preview
    $("#filePhoto").on("change", (event) => {
        if (filePhoto.files && filePhoto.files[0]) {
            filePhotoPreview.src = URL.createObjectURL(event.target.files[0]);
        }
    });

    // fill date of birth from nic
    $("#txtNIC").on("change keyup", (e) => {
        let { dateOfBirth } = getNICinfo(e.target.value);
        $("#txtDOB").val(dateOfBirth);
    });

    // prevent from submission
    $("form").on("submit", (e) => e.preventDefault());


    // for form buttons
    $("#btnFmAdd").on("click", addEmployee);
}

const validateElementValue = (elementId) => {
    // get values need for validation
    let selector = `#${elementId}`;
    let value = $(selector).val();
    let regex = validationInfo[elementId].regex;

    // for optional values
    if (validationInfo[elementId].optional && value.trim() == "") {
        $(selector).parent().removeClass("has-error");
        $(selector).parent().removeClass("has-success");
        $(selector).parent().children("span").remove();
        return true;
    }

    // check form values with each regex
    if (!regex.test(value)) {
        $(selector).parent().removeClass("has-success");
        $(selector).parent().addClass("has-error");
        $(selector).parent().children("span").remove();
        $(selector).parent().append(`<span class="glyphicon glyphicon-remove form-control-feedback"></span>`);
        return false;
    } else {
        $(selector).parent().removeClass("has-error");
        $(selector).parent().addClass("has-success");
        $(selector).parent().children("span").remove();
        $(selector).parent().append(`<span class="glyphicon glyphicon-ok form-control-feedback"></span>`);
        return true;
    }
}

const validateForm = () => {
    let errors = "";
    let formData = {};

    // test each value and validate
    Object.keys(validationInfo).forEach(elementId => {
        let isValid = validateElementValue(elementId);

        if (!isValid) {
            errors += `${validationInfo[elementId].error}<br/>`
        } else {
            formData[validationInfo[elementId].mapping] = $(`#${elementId}`).val();
        }
    });
    console.log(formData);

    // if there aren't any errors
    if (errors == "") return formData;

    // if there are errors
    return errors;
}

const addEmployee = () => {
    const errors = validateForm();

    // if there are errors
    if (errors) {
        showOutputModal("Sorry!. Please fix these errors.", errors);
        return;
    }

    // proceed with adding
}

// modal for showing various outputs
const showOutputModal = (title, body) => {
    $("#modalOutputTitle").text(title);
    $("#modalOutputBody").html(body);
    $("#modalOutput").modal();
}

// http request sender
const request = (url, method, data = {}) => {
    return new Promise((resolve, reject) => {
        let req = $.ajax({
            url: url,
            method: method,
            data: data,
            dataType: "json"
        });

        req.done((res) => {
            if (res.status) {
                resolve(res);
            } else {
                showOutputModal("Error", res.msg);
                if (res.type == "auth") {
                    window.location = "noauth.html"
                }
            }
        });

        req.fail((jqXHR, textStatus) => {
            showOutputModal("Error", `Unable to retrive data from the server: ${textStatus}`);
        });
    });
}
