//
// halfviz.js
//
// instantiates all the helper classes, sets up the particle system + renderer
// and maintains the canvas/editor splitview
//
(function(){
  
  trace = arbor.etc.trace
  objmerge = arbor.etc.objmerge
  objcopy = arbor.etc.objcopy
  var parse = Parseur().parse

  var HalfViz = function(elt){
    var dom = $(elt)

    sys = arbor.ParticleSystem(2600, 512, 0.5)
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...
    sys.screenPadding(20)
    
    var _ed = dom.find('#editor')
    var _code = dom.find('textarea')
    var _canvas = dom.find('#viewport').get(0)
    var _grabber = dom.find('#grabber')
    
    var _updateTimeout = null
    var _current = null // will be the id of the doc if it's been saved before
    var _editing = false // whether to undim the Save menu and prevent navigating away
    var _failures = null
    
    var that = {
      io:IO("#editor .io"),
      init:function(){
        
        $(window).resize(that.resize)
        that.resize()
        that.updateLayout(Math.max(1, $(window).width()-340))

        _code.keydown(that.typing)
        _grabber.bind('mousedown', that.grabbed)

        $(that.io).bind('get', that.getDoc)
        $(that.io).bind('clear', that.newDoc)
        return that
      },
      
      getDoc:function(e){
        $.getJSON('library/journey-under-the-sea.json', function(doc){

          // update the system parameters
          if (doc.sys){
            sys.parameters(doc.sys)
          }

          // modify the graph in the particle system
          _code.val(doc.src)
          that.updateGraph()
          that.resize()
          _editing = false
        })
        
      },

      newDoc:function(){
        var lorem = "; some example nodes\nhello {color:red, label:HELLO}\nworld {color:orange}\n\n; some edges\nhello -> world {color:yellow}\nfoo -> bar {weight:5}\nbar -> baz {weight:2}"
        
        _code.val(lorem).focus()
        $.address.value("")
        that.updateGraph()
        that.resize()
        _editing = false
      },

      updateGraph:function(e){
        var network = parse(window.src);
        $.each(network.nodes, function(nname, ndata){
          if (ndata.label===undefined) ndata.label = nname
        })
        sys.merge(network)
        _updateTimeout = null
      },
      
      resize:function(){        
        var w = $(window).width() - 20
        var x = w - _ed.width()
        that.updateLayout(x)
        sys.renderer.redraw()
      },
      
      updateLayout:function(split){
        var w = dom.width()
        var h = _grabber.height()
        var split = split || _grabber.offset().left
        var splitW = _grabber.width()
        _grabber.css('left',split)

        var edW = w - split
        var edH = h
        _ed.css({width:edW, height:edH})
        if (split > w-20) _ed.hide()
        else _ed.show()

        var canvW = split - splitW
        var canvH = h
        _canvas.width = canvW
        _canvas.height = canvH
        sys.screenSize(canvW, canvH)
                
        _code.css({height:h-20,  width:edW-4, marginLeft:2})
      },
      
      grabbed:function(e){
        $(window).bind('mousemove', that.dragged)
        $(window).bind('mouseup', that.released)
        return false
      },
      dragged:function(e){
        var w = dom.width()
        that.updateLayout(Math.max(10, Math.min(e.pageX-10, w)) )
        sys.renderer.redraw()
        return false
      },
      released:function(e){
        $(window).unbind('mousemove', that.dragged)
        return false
      },
      typing:function(e){
        var c = e.keyCode
        if ($.inArray(c, [37, 38, 39, 40, 16])>=0){
          return
        }
        
        if (!_editing){
          $.address.value("")
        }
        _editing = true
        
        if (_updateTimeout) clearTimeout(_updateTimeout)
        _updateTimeout = setTimeout(that.updateGraph, 900)
      }
    }
    
    return that.init()    
  }


  $(document).ready(function(){
	
	var startWhell = function(start_url) {
		
		var parseHost = function(e) {
			e = e.prop('hostname').trim().replace(/^www\./,'').replace(/\.com$/,'');
			e = e.charAt(0).toUpperCase() + e.substr(1);
			return e;
		}
		
		var urls = [];
		var start_host = parseHost($('<a href="' + start_url  + '">#</a>'));
		var ignore_hosts = ["Localhost","Xiti","Creativecommons.org","Addthis","Facebook","Google","Plus.google","Adobe","Twitter","Membres.lycos.fr"]
		var max_nodes_by_node = 36;
		
		window.max_depth = 20000;
		window.current_depth = 1;
		window.nodes = {};
		window.nodes_count = {};
		window.nodes[start_host] = { "color" : "#444" };
		window.src = "";
		window.running = true;
		
		var updateWheel = function() {
			window.src = "";
			for (line in window.nodes) {
				window.src += line;
				for (option in window.nodes[line]) {
					window.src += " {" + option + ":" + window.nodes[line][option] + "}"
				}
				window.src += "\n";
			}
			mcp.updateGraph();
		}

		var parseUrl = function(url) {
				var origin_link_object = $('<a href="' + url + '">#</a>');
				var origin_hostname = parseHost(origin_link_object);
				urls.push(url);

				$.ajaxQueue({
					url: url,
			  		type: "GET",
					timeout:2200,
			  		dataType: "html"}).done(function(data) {
					if(typeof(data['results']) === 'undefined') {
						if ( url == start_url ) {
							$("#stop").click();
							alert('The main website seems down.');
						}
						return true;
					}
					var raw_html = data['results'][0];
					if(typeof(raw_html) === 'undefined') {
						if ( url == start_url ) {
							$("#stop").click();
							alert('The main website seems down.');
						}
						return true;
					}
					if ( origin_hostname != start_host) {
						window.nodes[origin_hostname] = { color: "#95cde5"};
					}
					var html = raw_html.replace(/<img\b[^>]*>/ig, '');
					var website = document.createElement('div');
					website.innerHTML = html;
					websiteLinks = website.getElementsByTagName('a');
					$.each(websiteLinks, function( index ) {
						var doc      = document
					    , old_base = doc.getElementsByTagName('base')[0]
					    , old_href = old_base && old_base.href
					    , doc_head = doc.head || doc.getElementsByTagName('head')[0]
					    , our_base = old_base || doc_head.appendChild(doc.createElement('base'))
					    , resolver = doc.createElement('a')
					    , resolved_url
					    ;
					  	our_base.href = url;
						var link_object = $('<a href="' + this + '">#</a>');
						var new_url = this.href;
						var link_host = parseHost(link_object);
						if (jQuery.inArray(link_host, ignore_hosts) === -1) {
							var connection = origin_hostname + " -> " + link_host;
							if (connection in window.nodes) {
								var actual_weight = window.nodes[connection]["weight"];
								if (actual_weight < 2) {
									window.nodes[connection] = { weight: actual_weight + 1 }
								}
							} else {
								if (!( origin_hostname in window.nodes_count)) {
									window.nodes_count[origin_hostname] = 1;
								}
								if ( max_nodes_by_node > window.nodes_count[origin_hostname] ) {
									window.nodes[connection] = { weight: 1 }
									window.nodes_count[origin_hostname] = window.nodes_count[origin_hostname] + 1;
								}
							}
							if ( link_host != start_host) {
								if ( link_host in window.nodes ) {
									//window.nodes[link_host] = { color: "#3B5998"};
								} else {
									window.nodes[link_host] = { color: "#db8e3c"};
								}
							}
							if (jQuery.inArray(new_url, urls) === -1) {
								parseUrl(new_url);
							}
						}
						if (old_base) old_base.href = old_href;
					  	else doc_head.removeChild(our_base);
					})
					updateWheel();
			    }).fail(function(data) { 
					if ( origin_hostname != start_host) { 
						window.nodes[origin_hostname] = { color: "#b01700" };
					} else {
						if ( url == start_url ) {
							$("#stop").click();
							alert('The main website seems down.');
						}
					} 
					updateWheel(); });
		}
		
		parseUrl(start_url);
		
	}
	
	$('#form').submit(function(e) {
	    return true;
	})
	
	$("#stop").click(function() {
		$('#loader').addClass('paused');
	  	$('#start').show();
		$('#stop').hide();
		window.running = false;
	    return false;
	});
	
	var qs = (function(a) {
	    if (a == "") return {};
	    var b = {};
	    for (var i = 0; i < a.length; ++i)
	    {
	        var p=a[i].split('=');
	        if (p.length != 2) continue;
	        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
	    }
	    return b;
	})(window.location.search.substr(1).split('&'));
	
	if(typeof(qs['website']) !== 'undefined') {
		var main_website = qs['website'].trim();
		$('#website').val(main_website);
		$('#loader').removeClass('paused');
		$('#start').hide();
		$('#stop').show();
		startWhell(main_website);
	}
	
	window.mcp = HalfViz("#halfviz");
	window.mcp.resize();
	
  })

  
})()