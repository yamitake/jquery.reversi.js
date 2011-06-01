/**
 jquery.reversi.js ver0.3

The MIT License

Copyright (c) 2011 yapr

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */
(function($) {
	/** セルに何も置かれていない状態 */
	var CLASS_BLANK = 'blank';
	var CLASS_BLACK = 'black';
	var CLASS_WHITE = 'white';

	var CLASS_MESSAGE_BAR    = 'message_bar';
	var CLASS_MESSAGE_DIALOG = 'message_dialog';

	/** 石が置かれた時のイベント */
	var EVENT_REVERSI_PUT = 'reversi_put';

	/** alert message */
	var MESSAGE_CANT_PUT  = 'It is not possible to put it there.';

	$.fn.reversi = function(options){
		/**
		 * default Options
		 */
		var defaults ={
			cpu   : true, //cpuを使用するか
			my_color : 'black' ,
			cols  : 8   ,
			rows  : 8   ,

			width : 296 ,
			height: 296
		};

		return this.each(function(){
			var opts = $.extend(defaults , options);

			//styleの設定
			$(this).addClass('reversi_board');
			$(this).width(opts.width);
			$(this).height(opts.height);

			/** reversi盤[][] */
			var board = initBoard(opts , this);
			//infomation display component
			var _messagebar = createMessageBar(this , opts.width);
			var _messageDialog = createMessageDialog(this , opts.width);
			var turn = CLASS_BLACK;

			//盤が押されたときの処理
			$(this).bind(EVENT_REVERSI_PUT , function(e , data){
				//ひっくり返せないので置けない。
				if(!canPut(board , turn , data.col , data.row)){
					showMessage(MESSAGE_CANT_PUT , _messagebar);
					return;
				}

				//石を置く
				upsets(board , turn , data.col , data.row);

				//終了判定
				if(isFinish(this)){
					var black = $(this).find('.' + CLASS_BLACK).length;
					var white = $(this).find('.' + CLASS_WHITE).length;

					//勝ちの判定
					var text = '<h5>' + ((black < white) ? 'white' : 'black') +  ' win!!</h5>';
					if(black == white){
						text = '<h5>drow</h5>';
					}
					text += '<p>It is reload when playing a game again as for a browser. </p>';

					showDialog(text , _messageDialog);
					return;
				}

				//相手のターンにチェンジ
				turn = nextTurn(board , (turn == CLASS_BLACK) ? CLASS_WHITE : CLASS_BLACK , _messagebar);

				if(opts.cpu && turn != opts.my_color){
					cpuTurn(this , board , turn);
				}
			});

			//先手が白の場合
			if(opts.cpu && opts.my_color == CLASS_WHITE){
				cpuTurn(this , board , turn);
			}
		});
	};

	/**
	 * ボードの初期化処理
	 * 真ん中に黒と白のコマを配置する
	 *
	 * @params cols
	 * @params rows
	 * @return
	 */
	function initBoard(opts , board_element){
		var board = [];
		var cols = opts.cols;
		var rows = opts.rows;

		//set cell
		cell_width  = opts.width /opts.cols - 2;//border 1px
		cell_height = cell_width;

		for(var i = 0; i < cols; i++){
			board[i] = [];
			for(var k = 0; k < rows; k++){
				var style_name = CLASS_BLANK;

				// ○●
				// ●○
				if((i == (cols / 2) - 1 && k == (rows / 2) - 1)  || (i == (cols / 2) && k == (rows / 2))){
					style_name = CLASS_BLACK;
				}else if((i == (cols / 2) - 1 && k == (rows / 2)) || (i == (cols / 2) && k == (rows / 2) - 1)){
					style_name = CLASS_WHITE;
				}

				board[i][k] = $("<div/>", {
									  "class": style_name ,
									  "col"  : i ,
									  "row"  : k ,
									  "style": 'width:' + cell_width + 'px;height:' + cell_height + 'px;'
									}).appendTo(board_element);
			}
		}

		$(board_element).click(function(e){
			var target = $(e.target);

			target.parent().trigger(EVENT_REVERSI_PUT ,
								{
									'col' : target.attr('col') ,
									 'row' : target.attr('row')
								}
			);
		});

		return board;
	}

	/**
	 * ゲームが終わっているか
	 * @returns boolean
	 */
	function isFinish(board_elements){
		return (0 == $(board_elements).find('.' + CLASS_BLANK).length);
	}

	/**
	 * 対戦モード時にcpuが手を選択し、メインに置く手を設定する。
	 * とりあえず、置ける所を見つけたら置く。
	 */
	function cpuTurn(board_element , board , cpu_color){
		var col;
		var row;

		//考えられる手をキープ
		var keepStrategy = new Array();
		cols = board.length;
		rows = board[0].length;
		for(var i = 0; i < cols; i++){
			for(var k = 0; k < rows; k++){
				if(board[i][k].hasClass(CLASS_BLANK)){
					//置く場所があった場合手をキープ
					if(canPut(board , cpu_color , i , k)){
						//端における場合は優先的に置く
						if((i == 0 && k== 0)            ||
							(i == (cols - 1) && k == 0) ||
							(i == (cols - 1) && k == (rows - 1)) ||
							(i == 0 && k == (rows -1))){
								return $(board_element).trigger(EVENT_REVERSI_PUT ,
										{ 'col' : i ,
									      'row' : k
									    });
						}

						keepStrategy[keepStrategy.length] = {col:i , row:k};
					}
				}
			}
		}

		//
		var stragy = keepStrategy[parseInt(Math.random()*keepStrategy.length)];
		$(board_element).trigger(EVENT_REVERSI_PUT ,
				{ 'col' : stragy.col ,
				  'row' : stragy.row }
			);
	}

	/**
	 * 石を置いて周りの石をひっくり返す。
	 */
	function upsets(board , style_name , col , row){
		var firstPut = board[col][row];
		firstPut.removeClass(CLASS_BLANK);
		firstPut.addClass(style_name);

		var reverseElements = new Array();
		$.merge(reverseElements , findReverseElements(board , style_name , col , row ,  0 , -1 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row ,  1 , -1 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row ,  1 ,  0 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row ,  1 ,  1 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row ,  0 ,  1 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row , -1 ,  1 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row , -1 ,  0 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row , -1 , -1 , false));

		$(reverseElements).each(function(){
			this.attr('class' , style_name);
		});
	}

	/**
	 * 次のターンの色を決定する。
	 * 全く置く場所がなかった場合はパスとなり相手のターンとなる。
	 */
	function nextTurn(board , nextTurn , _messagebar){
		cols = board.length;
		rows = board[0].length;
		for(var i = 0; i < cols; i++){
			for(var k = 0; k < cols; k++){
				if(board[i][k].hasClass(CLASS_BLANK)){
					//置く場所があった場合、相手のターンになる
					if(canPut(board , nextTurn , i , k)){
						return nextTurn;
					}
				}
			}
		}

		//path
		showMessage(nextTurn + ' path.' , _messagebar);
		return (nextTurn == CLASS_BLACK) ? CLASS_WHITE : CLASS_BLACK;
	}

	/**
	 * 石を指定の位置に置くことが出来るかどうか
	 *
	 * 石が置ける条件:
	 * 隣あわせ（縦、横、斜め）に違う色の石があり、
	 * 対角線上に自分の色があること。
	 */
	function canPut(board , class_color , col , row){
		//isBlank
		if(!board[col][row].hasClass(CLASS_BLANK)){
			return false;
		}

		var canReverseArray = new Array();

		return $.merge(canReverseArray , findReverseElements(board , class_color , col , row ,  0 , -1)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row ,  0 , -1)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row ,  1 , -1)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row ,  1 ,  0)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row ,  1 ,  1)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row ,  0 ,  1)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row , -1 ,  1)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row , -1 ,  0)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row , -1 , -1)).length;
	}

	/**
	 * 指定された位置から、支持された方向に対して、
	 * ひっくり返すことのできる石(element)を返す
	 * @return Array
	 */
	function findReverseElements(board , style_name , current_col , current_row , advances_col_index , advances_row_index){
		var reverseArray = new Array();
		var max_col = board.length -1;
		var max_row = board[0].length - 1;

		for(var i = 1 ;; i++){
			var col = parseInt(current_col) + advances_col_index * i;
			var row = parseInt(current_row) + advances_row_index * i;

			//端まで行った場合
			if(col > max_col
				|| col < 0
				|| row > max_row
				|| row < 0){
				break;
			}

			//隣接する石が同じだった場合
			var div = board[col][row];
			if(div.hasClass(CLASS_BLANK)
				|| (i == 1 && div.hasClass(style_name))){
				break;
			}

			if(div.hasClass(style_name)){
				//一つ目以降で対角線に自分の色が合ったらreturn
				return reverseArray;
				break;
			}else{
				//ひっくり返す石をkeepする.
				reverseArray[reverseArray.length] = div;
			}
		}

		return new Array();
	}

	/**
	 * メッセージ領域を生成する
	 * @returns Element
	 */
	function createMessageBar(board_element , width){
		//statusmessage
		return $("<div/>", {
			  "class": CLASS_MESSAGE_BAR ,
			  "style": "display:none;width:" + eval(width - 8) + "px;"
			}).appendTo(board_element);
	}

	/**
	 * ダイアログ領域を生成する
	 */
	function createMessageDialog(board_element , width){
		//statusmessage
		return $("<div/>", {
			  "class": CLASS_MESSAGE_DIALOG ,
			  "style": "display:none;width:" + width * 2/3 + "px;left:" + width / 6  + "px;"
			}).appendTo(board_element);
	}

	/**
	 * 盤内にメッセージを表示する。
	 */
	function showMessage(text , _messagebar){
		_messagebar.stop().css("opacity", 1)
	           .text(text)
	           .fadeIn(30).fadeOut(1800);
	}

	/**
	 * ダイアログを表示する。
	 */
	function showDialog(text , elem){
			$(elem).closest("." + CLASS_MESSAGE_DIALOG)
				   .stop()
				   .css("opacity", 1)
				   .html(text)
				   .fadeIn(90);
	}

})(jQuery);