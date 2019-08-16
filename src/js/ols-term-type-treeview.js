"use strict"

require("JSON2")
require('jstorage');

$.jstree.defaults.core.data = true;
$.jstree.defaults.core.expand_selected_onload = true;


/**
 *
 *
 * @param olsIRI
 * @param ontology
 * @param divId
 * @param termIRI Having termIRI here does not make sense. It should be moved to the draw() method.
 * @param termType
 * @param siblingsElm
 * @param viewModeElm
 * @param saveState
 * @constructor
 */
function OLSTermTypeTreeView(olsIRI, ontology, divId, termIRI, termType, siblingsElm, viewModeElm, saveState) {
    this.olsIRI = olsIRI;
    this.ontology = ontology;
    this.divId = divId;
    this.termIRI = termIRI;
    this.termType = getUrlType(termType);
    this.siblingsElm = siblingsElm;
    this.viewModeElm = viewModeElm;
    this.saveState = saveState;
}

function _dataCB(node, cb, relativePath, url, ontology, termIRI, termType, showSiblings, viewMode, saveState) {
    console.log("_dataCB, relativePath = ", relativePath);
    console.log("_dataCB, url = ", url);
    console.log("_dataCB, ontology = ", ontology);
    console.log("_dataCB, termType = ", termType);
    console.log("_dataCB, viewMode = ", viewMode);
    console.log("_dataCB, showSiblings = ", showSiblings);

    var rootUrl = _determineRootURL(relativePath, viewMode, termType, ontology);

    url += '?viewMode=' + viewMode;

    if (showSiblings) {
        url += '&siblings=true';
    } else {
        url += '&siblings=false';
    }

    if (node.id === '#' && termIRI !== '') {
        _renderSingleTerm(node, cb, url, saveState, termIRI);
    }
    else if (node.id === '#' && termIRI === '') {
        _renderRoots(rootUrl, cb, termType);
    }
    else {
        var baseUrl = relativePath + 'api/ontologies/' + ontology + '/' + termType + '/';
        _renderChildren(node, cb, baseUrl);
    }

    // clear local storage for this term
    if (saveState) {
        if (termIRI != '' && $.jStorage.get(termIRI)) {
            $.jStorage.deleteKey(termIRI)
        }
    }
};

OLSTermTypeTreeView.prototype.toString =  function () {
    return "(olsIRI = " + this.olsIRI + ", ontology = " + this.ontology + ", termType = " + this.termType +
        ", viewModeElm = " + this.viewModeElm + ", divId = " + this.divId + ")";
}

function _determineUrl(relativePath, ontology, termType, termIRI) {
    var baseUrl = 'api/ontologies/' + ontology + '/' + termType + '/';
    var url = baseUrl + encodeURIComponent(encodeURIComponent(termIRI)) + '/jstree';
    url = url.replace('//', '/');
    url = relativePath + url;
    return url;
}

function _toggleShowHideSiblingsLabel(showSiblings, siblingsElm) {
    if (showSiblings) {
        $("button[name='" + siblingsElm + "']").text("Hide siblings");
    }
    else {
        $("button[name='" + siblingsElm + "']").text("Show all siblings");
    }
}

OLSTermTypeTreeView.prototype.draw =  function (showSiblings, viewMode) {
    var relativePath = this.olsIRI ? this.olsIRI : '';
    var url = _determineUrl(relativePath, this.ontology, this.termType, this.termIRI);

    var localTermIRI = this.termIRI;
    var localSaveState = this.saveState;
    var localTermType = this.termType;
    var localOntology = this.ontology;
    var localDivId = this.divId;
    var localShowSiblingsElm = this.siblingsElm;
    var localViewModeElm = this.viewModeElm;

    _toggleShowHideSiblingsLabel(showSiblings, localShowSiblingsElm);

    var treeDiv = $(localDivId).jstree({
        'check_callback' : true,
        'core' : {
            'data': function(node, cb) {
                _dataCB(node, cb, relativePath, url, localOntology, localTermIRI, localTermType, showSiblings, viewMode,
                    localSaveState);
            },
            "themes": {
                "dots": true
                , "icons": false,
                "name" : "proton"
                //"responsive" : true
            }
        },
        plugins: ["sort"]
    }).bind("select_node.jstree", function(node, selected, event) {
        var data = $(localDivId).jstree(true).get_json();
        var iri  = selected.node.original.iri ? selected.node.original.iri : selected.node.original.a_attr.iri;
        var ontology =  selected.node.original.ontology_name ? selected.node.original.ontology_name :
            selected.node.original.a_attr.ontology_name;
        var showSiblings = $("button[name='" + localShowSiblingsElm + "']").val() == 'true';
        var viewMode = $("input[name='" + localViewModeElm + "']:checked").val();
        if (this.saveState) {
            $.jStorage.set(iri, data);
        }
        _onClick.call(this, event, selected, relativePath, localTermIRI, localTermType, iri, ontology, showSiblings,
            viewMode);
    }).bind('after_close.jstree', function (e, data) {
        var tree = $(localDivId).jstree(true).get_json();
        tree.delete_node(data.node.children);
        tree._model.data[data.node.id].state.loaded = false;
    });
}


/**
 *
 * @param relativePath
 * @returns {string}
 */
function _determineRootURL(relativePath, viewMode, termType, ontology) {
    var rootUrl;

    if (viewMode === "All" ||  termType != "terms")
        rootUrl = relativePath + 'api/ontologies/' + ontology + '/' + termType +
            '/roots?size=500';
    else if (viewMode === "PreferredRoots") // PREFERRED_ROOTS.viewMode is assumed
        rootUrl = relativePath + 'api/ontologies/' + ontology + '/' + termType +
            '/preferredRoots?size=500';
    else
        throw new TypeError("Unknown viewMode = " + viewMode + ".");
    return rootUrl;
}

OLSTermTypeTreeView.prototype.toggleOntologyView=function(){
    var viewMode = $("input[name='" + this.viewModeElm + "']:checked").val();

    var relativePath = this.olsIRI ? this.olsIRI : '';
    var url = _determineUrl(relativePath, this.ontology, this.termType, this.termIRI);

    var localTermIRI = this.termIRI;
    var localSaveState = this.saveState;
    var localTermType = this.termType;
    var localOntology = this.ontology;

    var showSiblings = $("button[name='" + this.siblingsElm + "']").val() == 'true';

    $(this.divId).jstree(true).settings.core.data = function(node, cb){
        _dataCB(node, cb, relativePath, url, localOntology, localTermIRI, localTermType, showSiblings, viewMode,
            localSaveState);
    };

    $(this.divId).jstree(true).refresh();
}


OLSTermTypeTreeView.prototype.toggleSiblings=function() {
    var showSiblings = $("button[name='" + this.siblingsElm + "']").val() == 'true';

    showSiblings = !(showSiblings);
    _toggleShowHideSiblingsLabel(showSiblings, this.siblingsElm);

    $("button[name='" + this.siblingsElm + "']").val(showSiblings);



    var relativePath = this.olsIRI ? this.olsIRI : '';
    var url = _determineUrl(relativePath, this.ontology, this.termType, this.termIRI);

    var localTermIRI = this.termIRI;
    var localSaveState = this.saveState;
    var localTermType = this.termType;
    var localOntology = this.ontology;
    var viewMode = $("input[name='" + this.viewModeElm + "']:checked").val();

    $(this.divId).jstree(true).settings.core.data = function(node, cb){
        _dataCB(node, cb, relativePath, url, localOntology, localTermIRI, localTermType, showSiblings, viewMode,
            localSaveState);
    };
    $(this.divId).jstree(true).refresh();
}


function _renderSingleTerm (node, cb, url, saveState, termIRI) {
    if (saveState && $.jStorage.get(termIRI)) {
        cb($.jStorage.get(termIRI))
    } else {
        $.getJSON(url, function (data) {
            cb(data)
        }).fail(function(){
            console.log("Could not connect to " + url)
        });
    }
}

function _renderRoots(url, cb, termType) {
    $.getJSON(url, function (data) {
        var data = _processOlsData(data, '#', termType);
        cb(data)
    }).fail(function(){
        console.log("Could not connect to " + url)
    });
}

function _renderChildren (node, cb, url) {
    var requestIri = node.original.iri ? node.original.iri : node.original.a_attr.iri;

    var childrenUrl = url + encodeURIComponent(encodeURIComponent(requestIri)) + '/jstree/children/'+ node.id;

    $.getJSON(childrenUrl, function (data) {
        cb(data)
    }).fail(function(){
        console.log("Could not connect to " + childrenUrl)
    });
}


function _processOlsData(data, parentId, termType) {

    var newData = [];
    var counter = 1;
    var results = [];

    if (data._embedded != undefined) {
        if (termType == "properties") {
            results = data._embedded.properties;
        }
        else if (termType == "individuals") {
            results = data._embedded.individuals;
        }
        else if (termType == "terms") {
            results = data._embedded.terms;
        }
    }
    $.each(results, function(index, term) {
        var id = parentId + "_" + counter;
        var parent = parentId;
        if (parentId === '#') {
            id = counter;
            parent = parentId;
        }

        newData.push({
                "id" : id,
                "parent" : parent,
                "iri" : term.iri,
                "ontology_name" : term.ontology_name,
                "text" : term.label,
                "leaf" : !term.has_children,
                "children" : term.has_children,
                "a_attr" : {
                    "iri" : term.iri,
                    "ontology_name" : term.ontology_name,
                    "title" : term.iri,
                    "class" : "is_a"
                }
            }
        );
        counter++;
    });
    return newData;
}


function getUrlType (termType) {
    var urlType = 'terms';
    if (termType == 'property') {
        urlType = 'properties';
    }
    else if (termType == 'individual') {
        urlType= 'individuals';
    }
    else if (termType == 'ontology') {
        urlType= 'ontology';
    }
    return urlType;
}


function _onClick(node, event, relativePath, currentTermIri, termType, selectedIri, ontology_name, showSiblings, viewMode){
    var type = termType;
    if (type == 'individuals' && termIri != selectedIri) {
        type = getUrlType('terms');
    }

    var newpath=relativePath + "ontologies/" + ontology_name + "/" + type + '?iri=' + encodeURIComponent(selectedIri) +
        '&viewMode=' + viewMode + '&siblings=' + showSiblings;

    console.log("_onClick newpath=", newpath);
    _goTo(newpath)
}

function _goTo (url) {
    window.location.href =  url;
}

module.exports = OLSTermTypeTreeView;

