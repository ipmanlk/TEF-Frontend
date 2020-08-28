/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
    await loadFormDropdowns();
    registerEventListeners();

    // create an array from permission string
    const permission = permissionStr.split("").map((p) => parseInt(p));

    if (permission[2] == 0) {
        $(".btnFmUpdate").hide();
    }
}

const loadFormDropdowns = async () => {
    // define needed attributes
    let materials, suppliers;

    // get data from the api for each dropbox
    let response;
    response = await Request.send("/api/suppliers?data[limit]=0", "GET");
    suppliers = response.data;

    response = await Request.send("/api/materials?data[limit]=0", "GET");
    materials = response.data;

    // clean existing options and append new data
    $("#supplierId").empty();
    $("#materialIds").empty();

    suppliers.forEach(sup => {
        $("#supplierId").append(`<option data-tokens="${sup.code} - ${sup.companyName}" value="${sup.id}">${sup.code} - ${sup.companyName}</option>`);
    });

    materials.forEach(mat => {
        $("#materialIds").append(`<option data-tokens="${mat.code} - ${mat.name}" value="${mat.id}">${mat.code} - ${mat.name}</option>`);
    });

    // init bootstrap-select
    $("#supplierId").selectpicker();
    $("#materialIds").selectpicker();

    // select initial value
    $("#supplierId").selectpicker('val', suppliers[0].id);
    selectMaterials(suppliers[0].id);
}

// event listeners for form inputs
const registerEventListeners = async () => {
    $("#supplierId").on('changed.bs.select', function (e, clickedIndex, isSelected, previousValue) {
        const selectedSupplierId = e.target.value;
        selectMaterials(selectedSupplierId);
    });


    $(".btnFmDelete").click((e) => {
        e.preventDefault();
        $("#supplierId").selectpicker('deselectAll');
        $("#materialIds").selectpicker('deselectAll');
        $("#supplierId").selectpicker('refresh');
        $("#materialIds").selectpicker('refresh');
    });

    $(".btnFmUpdate").click((e) => {
        e.preventDefault();
        updateEntry();
    });

    $("#btnTopAddSupplier").click(() => {
        mainWindow.loadRoute("supplier");
    });

    $("#btnTopAddMaterial").click(() => {
        mainWindow.loadRoute("material");
    });
}

// select materials belong to a given supplier id
const selectMaterials = async (supplierId) => {
    const response = await Request.send(`/api/supplier_materials?data[supplierId]=${supplierId}`, "GET");
    if (response.status) {
        const matIds = response.data.materials.map(m => m.id);
        $("#materialIds").selectpicker('val', matIds);
    }
}


// update entry in the database
const updateEntry = async () => {
    const data = {
        supplierId: $("#supplierId").selectpicker('val'),
        materialIds: $("#materialIds").selectpicker('val'),
    }

    // send put reqeust to update data
    const response = await Request.send("/api/supplier_materials", "PUT", { data: data });

    // show output modal based on response
    if (response.status) {
        mainWindow.showOutputToast("Success!", response.msg);
    }
}