// load routes
const loadRoute = (route) => {
    let routes = getRoutes();
    $("#iframeContent").attr("src", routes[route].path);
}

// handle navbar title changing
const updateNavbarTitle = () => {
    let path = $("#iframeContent").attr("src");
    let routes = getRoutes();
    routes = Object.values(routes).filter(route => route.path == path);
    $("#txtNavbarTitle").text(routes[0].title);
}

const getRoutes = () => {
    return {
        "dashboard": {
            title: "Dashboard",
            path: "./pages/dashboard.html"
        },
        "employee": {
            title: "Employee View",
            path: "./pages/employee.html"
        }
    }
}