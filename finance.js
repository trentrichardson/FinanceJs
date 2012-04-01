/*
* finance.js v0.1
* By: Trent Richardson [http://trentrichardson.com]
*
* Copyright 2012 Trent Richardson
* You may use this project under MIT or GPL licenses.
* http://trentrichardson.com/Impromptu/GPL-LICENSE.txt
* http://trentrichardson.com/Impromptu/MIT-LICENSE.txt
*/

;(function(root){

	var lib = {};

	lib.version = '0.1';

	/*
	*	Defaults
	*/
	lib.settings = {
			currency: 'USD',
			currencies: {
					USD: { before: '$', after: '', precision: 2 }, // $
					GBP: { before:'£', after: '', precision:2 }, // £ or &#163;
					EUR: { before:'€', after: '', precision:2 }, // € or &#8364;
					percent: { before: '', after: '%', precision:0 },
					defaults: { before:'', after:'', precision:0 }
				}
		};

	lib.defaults = function(object, defs) {
			var key;
			object = object || {};
			defs = defs || {};
		
			for (key in defs) {
				if (defs.hasOwnProperty(key)) {
					if (object[key] == null) object[key] = defs[key];
				}
			}
			return object;
		};
	
	/*
	*	Currencies
	*/

	// add a currency format to library
	lib.addCurrency = function(key, options){
			
			this.settings.currencies[key] = this.defaults(options, this.settings.currencies.defaults);
			
			return true;
		};

	// remove a currency format from library
	lib.removeCurrency = function(key){
			delete this.settings.currencies[key];
			return true;
		};


	/*
	*	Formatting
	*/

	// return a number to a specific precision
	lib.numberFormat = function(num, precision){
			if(precision === undefined)
				precision = 0;
			return  parseFloat(Number(num)).toFixed(precision);
		};

	// return a number formatted in the specified currency or setting
	lib.currencyFormat = function(num, settings){
			if(settings === undefined)
				settings = this.settings.currencies[this.settings.currency];
			else if(typeof settings == 'string')
				settings = this.settings.currencies[settings];
			else settings = settings;

			settings = this.defaults(settings, this.settings.currencies.defaults);
			return  settings.before + this.numberFormat(num, settings.precision) + settings.after;
		};

	// create a formatted percent 
	lib.percentFormat = function(num, precision){
			var tmp = this.settings.currencies.percent;
			if(precision)
				tmp.precision = precision;
			return  this.currencyFormat(num, tmp);
		};


	/*
	*	Financing
	*/
	
	//	calculate total of principle + interest (yearly) for x months
	lib.calculateAccruedInterest = function(principle, months, rate){
			var i = rate/1200;
			return (principle * Math.pow(1+i,months)) - principle;
		};

	//	determine the amount financed
	lib.calculateAmount = function(finMonths, finInterest, finPayment){
			var result = 0;
				
			if(finInterest == 0){
				result = finPayment * finMonths;
			}
			else{ 
				var i = ((finInterest/100) / 12),
					i_to_m = Math.pow((i + 1), finMonths),		
					a = finPayment / ((i * i_to_m) / (i_to_m - 1));
				result = Math.round(a * 100) / 100;
			}

			return result;
		};

	//	determine the months financed
	lib.calculateMonths = function(finAmount, finInterest, finPayment){
			var result = 0;

			if(finInterest == 0){
				result = Math.ceil(finAmount / finPayment);
			}
			else{ 
				result = Math.round(( (-1/12) * (Math.log(1-(finAmount/finPayment)*((finInterest/100)/12))) / Math.log(1+((finInterest/100)/12)) )*12);
			}
	
			return result;
		};

	//	determine the interest rate financed http://www.hughchou.org/calc/formula.html
	lib.calculateInterest = function(finAmount, finMonths, finPayment){
			var result = 0;
	
			var min_rate = 0, max_rate = 100;
			while(min_rate < max_rate-0.0001){
				var mid_rate = (min_rate + max_rate)/2,
					j = mid_rate / 1200,
					guessed_pmt = finAmount * ( j / (1-Math.pow(1+j, finMonths*-1)));
			
				if(guessed_pmt > finPayment){
					max_rate = mid_rate;
				}
				else{
					min_rate = mid_rate;
				}
			}
			return mid_rate.toFixed(2);
		};

	//	determine the payment
	lib.calculatePayment = function(finAmount, finMonths, finInterest){
			var result = 0;
				
			if(finInterest == 0){
				result = finAmount / finMonths;
			}
			else{
				var i = ((finInterest/100) / 12),
					i_to_m = Math.pow((i + 1), finMonths),		
					p = finAmount * ((i * i_to_m) / (i_to_m - 1));
				result = Math.round(p * 100) / 100;
			}

			return result;
		};

	// get an amortization schedule [ { principle: 0, interest: 0, payment: 0, paymentToPrinciple: 0, paymentToInterest: 0}, {}, {}...]
	lib.calculateAmortization = function(finAmount, finMonths, finInterest, finDate){
			var payment = this.calculatePayment(finAmount, finMonths, finInterest),
				balance = finAmount,
				interest = 0.0,
				totalInterest = 0.0,
				schedule = [],
				currInterest = null,
				currPrinciple = null,
				currDate = (finDate !== undefined && finDate.constructor === Date)? finDate : (new Date());
			
			for(var i=0; i<finMonths; i++){
				currInterest = balance * finInterest/1200;
				totalInterest += currInterest;
				currPrinciple = payment - currInterest;
				balance -= currPrinciple;

				schedule.push({
						principle: balance,
						interest: totalInterest,
						payment: payment,
						paymentToPrinciple: currPrinciple,
						paymentToInterest: currInterest,
						date: new Date(currDate.getTime())
					});
					
				currDate.setMonth(currDate.getMonth()+1);
			}
			
			return schedule;
		};

	
	/*
	*	Export this object globally
	*/
	
	if(typeof exports !== 'undefined'){
		if(typeof module !== 'undefined' && module.exports){
			exports = module.exports = lib;
		}
		exports.finance = lib;
	}
	else if(typeof define === 'function' && define.amd){
		define([], function(){
			return lib;
		});
	}
	else{
		root.finance = lib;
	}
	
})(this);
