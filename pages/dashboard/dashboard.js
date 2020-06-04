function updateTiles() {
    // show hide tiles based on privileges
    const privileges = mainWindow.tempData.privileges;

    // hide all tiles
    $(".TILE").hide();

    // show tiles based on privileges
    Object.keys(privileges).forEach(p => {        
        $(`.${p}.TILE`).show();
    });
}