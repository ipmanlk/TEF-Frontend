// load routes
const loadRoute = (route) => {

    let routes = getRoutes();

    // if route doesn't exist
    if (!routes[route]) {
        window.alert("This route doesnt exist (404)");
        return;
    }

    $("#iframeMain").attr("src", routes[route].path);

    // hide open modals
    $(".modal").modal("hide");

    // scroll to top
    $("html, body").animate({ scrollTop: 0 }, "slow");

    // change url
    history.pushState({}, null, `?page=${route}`);
}

// handle iframe src changing
const updateRouteInfo = () => {
    let path = document.getElementById("iframeMain").contentWindow.location.href;

    path = `.${path.substring(path.indexOf("/pages"), path.length)}`;

    // handle non authenticated cases
    if (path.indexOf("noauth.html") > -1) {
        window.location = "../login.html";
        return;
    }

    // proceed with title update
    let routes = getRoutes();
    routes = Object.values(routes).filter(route => route.path == path);
    $("#txtNavbarTitle").text(routes[0].title);

    // public data for iframe access
    const mainWindowData = {
        showOutputModal,
        showConfirmModal,
        showOutputToast,
        tempData,
        loadRoute
    }

    // make modal functions available inside the iframeMain
    const iframeWindow = document.getElementById("iframeMain").contentWindow;
    iframeWindow.mainWindow = mainWindowData;

    // if location is dashboard, update tile visibility
    if (path.indexOf("dashboard.html") > -1) {
        iframeWindow.updateTiles();
    }

    // set permissions for forms and other components inside iframe
    if (iframeWindow.loadModule) {
        path = path.replace(".html", "");
        const pathParts = path.split("/");
        const moduleName = pathParts[pathParts.length - 1].toUpperCase().trim();
        const permission = tempData.privileges[moduleName];
        iframeWindow.loadModule(permission);
    }
}

const getRoutes = () => {
    return {
        "dashboard": {
            title: "Dashboard",
            path: "./pages/dashboard/dashboard.html"
        },
        "employee": {
            title: "Employee View",
            path: "./pages/employee/employee.html"
        },
        "user": {
            title: "User View",
            path: "./pages/user/user.html"
        },
        "privilege": {
            title: "Privileges View",
            path: "./pages/privilege/privilege.html"
        },
        "role": {
            title: "Role View",
            path: "./pages/role/role.html"
        },
        "profile": {
            title: "Profile View",
            path: "./pages/profile/profile.html"
        },
        "designation": {
            title: "Designation View",
            path: "./pages/designation/designation.html"
        },
        "employee_status": {
            title: "Employee Status View",
            path: "./pages/employee_status/employee_status.html"
        },
        "customer": {
            title: "Customer View",
            path: "./pages/customer/customer.html"
        },
        "material": {
            title: "Material View",
            path: "./pages/material/material.html"
        },
        "product": {
            title: "Product View",
            path: "./pages/product/product.html"
        },
        "noauth": {
            title: "Auth Failure",
            path: "./pages/noauth.html"
        }
    }
}