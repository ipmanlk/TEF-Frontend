/// <reference path="http://code.jquery.com/jquery-1.4.1-vsdoc.js" />
/*
* Print Element Plugin 1.2
*
* Copyright (c) 2010 Erik Zaadi
*
* Inspired by PrintArea (http://plugins.jquery.com/project/PrintArea) and
* http://stackoverflow.com/questions/472951/how-do-i-print-an-iframe-from-javascript-in-safari-chrome
*
*  Home Page : http://projects.erikzaadi/jQueryPlugins/jQuery.printElement 
*  Issues (bug reporting) : http://github.com/erikzaadi/jQueryPlugins/issues/labels/printElement
*  jQuery plugin page : http://plugins.jquery.com/project/printElement 
*  
*  Thanks to David B (http://github.com/ungenio) and icgJohn (http://www.blogger.com/profile/11881116857076484100)
*  For their great contributions!
* 
* Dual licensed under the MIT and GPL licenses:
*   http://www.opensource.org/licenses/mit-license.php
*   http://www.gnu.org/licenses/gpl.html
*   
*   Note, Iframe Printing is not supported in Opera and Chrome 3.0, a popup window will be shown instead
*/
;(function(g){function k(c){c&&c.printPage?c.printPage():setTimeout(function(){k(c)},50)}function l(c){c=a(c);a(":checked",c).each(function(){this.setAttribute("checked","checked")});a("input[type='text']",c).each(function(){this.setAttribute("value",a(this).val())});a("select",c).each(function(){var b=a(this);a("option",b).each(function(){b.val()==a(this).val()&&this.setAttribute("selected","selected")})});a("textarea",c).each(function(){var b=a(this).attr("value");if(a.browser.b&&this.firstChild)this.firstChild.textContent=
b;else this.innerHTML=b});return a("<div></div>").append(c.clone()).html()}function m(c,b){var i=a(c);c=l(c);var d=[];d.push("<html><head><title>"+b.pageTitle+"</title>");if(b.overrideElementCSS){if(b.overrideElementCSS.length>0)for(var f=0;f<b.overrideElementCSS.length;f++){var e=b.overrideElementCSS[f];typeof e=="string"?d.push('<link type="text/css" rel="stylesheet" href="'+e+'" >'):d.push('<link type="text/css" rel="stylesheet" href="'+e.href+'" media="'+e.media+'" >')}}else a("link",j).filter(function(){return a(this).attr("rel").toLowerCase()==
"stylesheet"}).each(function(){d.push('<link type="text/css" rel="stylesheet" href="'+a(this).attr("href")+'" media="'+a(this).attr("media")+'" >')});d.push('<base href="'+(g.location.protocol+"//"+g.location.hostname+(g.location.port?":"+g.location.port:"")+g.location.pathname)+'" />');d.push('</head><body style="'+b.printBodyOptions.styleToAdd+'" class="'+b.printBodyOptions.classNameToAdd+'">');d.push('<div class="'+i.attr("class")+'">'+c+"</div>");d.push('<script type="text/javascript">function printPage(){focus();print();'+
(!a.browser.opera&&!b.leaveOpen&&b.printMode.toLowerCase()=="popup"?"close();":"")+"}<\/script>");d.push("</body></html>");return d.join("")}var j=g.document,a=g.jQuery;a.fn.printElement=function(c){var b=a.extend({},a.fn.printElement.defaults,c);if(b.printMode=="iframe")if(a.browser.opera||/chrome/.test(navigator.userAgent.toLowerCase()))b.printMode="popup";a("[id^='printElement_']").remove();return this.each(function(){var i=a.a?a.extend({},b,a(this).data()):b,d=a(this);d=m(d,i);var f=null,e=null;
if(i.printMode.toLowerCase()=="popup"){f=g.open("about:blank","printElementWindow","width=650,height=440,scrollbars=yes");e=f.document}else{f="printElement_"+Math.round(Math.random()*99999).toString();var h=j.createElement("IFRAME");a(h).attr({style:i.iframeElementOptions.styleToAdd,id:f,className:i.iframeElementOptions.classNameToAdd,frameBorder:0,scrolling:"no",src:"about:blank"});j.body.appendChild(h);e=h.contentWindow||h.contentDocument;if(e.document)e=e.document;h=j.frames?j.frames[f]:j.getElementById(f);
f=h.contentWindow||h}focus();e.open();e.write(d);e.close();k(f)})};a.fn.printElement.defaults={printMode:"iframe",pageTitle:"",overrideElementCSS:null,printBodyOptions:{styleToAdd:"padding:10px;margin:10px;",classNameToAdd:""},leaveOpen:false,iframeElementOptions:{styleToAdd:"border:none;position:absolute;width:0px;height:0px;bottom:0px;left:0px;",classNameToAdd:""}};a.fn.printElement.cssElement={href:"",media:""}})(window);


class FormUtil {
    static validateElementValue(elementValidationInfo) {
        // create selector name for ui element id
        const selector = `#${elementValidationInfo.attribute}`;

        // get value of element id
        const value = $(selector).val();

        // create RegExp object from regex string
        const regex = new RegExp(elementValidationInfo.regex);

        // if value is optional and not set, ignore
        if (elementValidationInfo.optional && value.trim() == "") {
            $(selector).parent().removeClass("has-error has-success");
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

    static enableRealtimeValidation(validationInfo) {
        // provide freedback when user interact with form elements
        validationInfo.forEach(vi => {
            $(`#${vi.attribute}`).on("keyup change", () => {
                this.validateElementValue(vi);
            });
        });
    }

    static setReadOnly(selector, readOnly) {
        if(readOnly) {
            $(`${selector} .form-group`).children().each((i, el) => {
                if ($(el).data("editable") == true) {
                    $(el).attr("readonly", true);
                    $(el).attr("disabled", true);
                }
            });   
        } else {
            $(`${selector} .form-group`).children().each((i, el) => {
                if ($(el).data("editable") == true) {
                    $(el).attr("readonly", false);
                    $(el).attr("disabled", false);
                }
            });
        }
    }
    
    static print() {
        $("input[type=file]").hide();
        $("#fmButtons").hide();
        $("#tabHolder").hide();
        window.print();
        $("#fmButtons").show();
        $("#tabHolder").show();
        $("input[type=file]").show();
        return true;
    }
}

class ImageUtil {
    static getURLfromBuffer(buffer) {
        // create image url from buffer data recived from server
        const arrayBufferView = new Uint8Array(buffer.data);
        const blob = new Blob([arrayBufferView], { type: "image/png" });
        const urlCreator = window.URL || window.webkitURL;
        const imageUrl = urlCreator.createObjectURL(blob);
        return imageUrl;
    }

    static getBase64FromFile(file) {
        // create a base64 string from a file object
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
}

class Request {
    static send(path, method, data = {}) {
        // send http requests and handle errors
        return new Promise((resolve, reject) => {
            const options = {
                type: method,
                contentType: "application/json; charset=utf-8",
                url: `http://localhost:3000${path}`,
                data: data,
                dataType: "json"
            }

            // send json on post bodies
            if (method == "POST" || method == "PUT" || method == "DELETE") {
                options.data = JSON.stringify(data);
            }

            const req = $.ajax(options);

            req.done((res) => {
                if (res.status) {
                    resolve(res);
                } else {
                    mainWindow.showOutputModal("Error", res.msg);
                    if (res.type == "auth") {
                        window.location = "noauth.html"
                    }
                }
            });

            req.fail((jqXHR, textStatus) => {
                mainWindow.showOutputModal("Error", `Unable to retrive data from the server: ${textStatus}`);
                reject(textStatus);
            });
        });
    }
}