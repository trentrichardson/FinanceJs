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
			format: 'number',
			formats: {
					USD: { before: '$', after: '', precision: 2, decimal: '.', thousand: ',', group: 3, negative: '-' }, // $
					GBP: { before:'£', after: '', precision: 2, decimal: '.', thousand: ',', group: 3, negative: '-' }, // £ or &#163;
					EUR: { before:'€', after: '', precision: 2, decimal: '.', thousand: ',', group: 3, negative: '-' }, // € or &#8364;
					percent: { before: '', after: '%', precision: 0, decimal: '.', thousand: ',', group: 3, negative: '-' },
					number: { before: '', after: '', precision: null, decimal: '.', thousand: ',', group: 3, negative: '-'},
					defaults: { before: '', after: '', precision: 0, decimal: '.', thousand: ',', group: 3, negative: '-' }
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
	*	Formatting
	*/
	
	// add a currency format to library
	lib.addFormat = function(key, options){			
			this.settings.formats[key] = this.defaults(options, this.settings.formats.defaults);
			return true;
		};

	// remove a currency format from library
	lib.removeFormat = function(key){
			delete this.settings.formats[key];
			return true;
		};

	// format a number or currency
	lib.format = function(num, settings, override){			
			num = parseFloat(num);
			
			if(settings === undefined)
				settings = this.settings.formats[this.settings.format];
			else if(typeof settings == 'string')
				settings = this.settings.formats[settings];
			else settings = settings;
			settings = this.defaults(settings, this.settings.formats.defaults);
			
			if(override !== undefined)
				settings = this.defaults(override, settings);
			
			// set precision
			if(settings.precision != null)
				num = num.toFixed(settings.precision);
				
			var isNeg = num < 0,
				numParts = Math.abs(num).toString().split('.'),
				baseLen = numParts[0].length;

			// add thousands and group
			numParts[0] = numParts[0].replace(/(\d)/g, function(str, m1, offset, s){
					return (offset > 0 && (baseLen-offset) % settings.group == 0)? settings.thousand + m1 : m1;
				});
				
			// add decimal
			num = numParts.join(settings.decimal);

			// add negative if applicable
			if(isNeg && settings.negative){
				num = settings.negative[0] + num;
				if(settings.negative.length > 1)
					num += settings.negative[1];
			}
			
			return  settings.before + num + settings.after;
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
  
      //	calculate time and money savings by paying extra
	lib.calculateEarlyPayoff = function(finAmount, finInterest, finMonths, finRemainingMonths, finExtraPay, finMonthlyPay){
      
        var principle1 = finAmount, interest1 = 0, principle2 = finAmount, interest2 = 0;
        var ep;
        var mRate = finInterest / 1200;
        var paidOff = finMonths;

        for (months=1; months<finMonths; months++)
        {
            if ( months > (finMonths-finRemainingMonths)) {
                ep = finExtraPay;
            }
            else {
                ep = 0;
            }
            var mi1 = mRate * principle1;
            interest1 += mi1;
            principle1 -= ( finMonthlyPay - mi1 );

            if ( principle2 > 0 )
            {
                var mi2 = mRate * principle2;
                interest2 += mi2;
                principle2 -= ( finMonthlyPay - mi2 + ep );
                if ( principle2 <= 0 ) {
                    principle2 = 0;
                    paidOff = months;
                }
            }
        }

        var timeDifference = finMonths - paidOff;
        var y = parseInt( timeDifference/12, 10 );	
        months = timeDifference%12;
      
        return {
            saving: interest1 - interest2,
            years: y,
            months: months
        };
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
				currDate = (finDate !== undefined && finDate.constructor === Date)? new Date(finDate) : (new Date());
			
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
